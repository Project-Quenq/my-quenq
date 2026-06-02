import { sqlite } from "./client.js";
import { canonicalEmail, defaultMedia, limits, reservedHandle, validHandle } from "../../policy.js";
import { normalizeRole, type UserRole } from "../../roles.js";
import { defaultSocialLinks, normalizeStoredSocialLinks, type SocialLinks } from "../../socialLinks.js";
import { normalizeTimeZone } from "../../timeZones.js";
import { recordFromUnknown, stringFromUnknown } from "../../values.js";
import { env } from "../env.js";
import { decodeKeysetCursor, keysetBeforeCondition, normalizePageLimit, pageFromRows, type PageOptions } from "../pagination.js";
import { ensureDefaultGroupMembership } from "./groups.js";
import { ensureProtectedAdminFriendship } from "./relationships.js";
import type { CurrentUser } from "../../currentUser.js";
import { defaultInterestNames, defaultInterests, defaultStatus, type PersonCard, type UserProfile } from "../../models.js";
import { profileVisibilitySql } from "./profileVisibility.js";
import { containsLikePattern, likeEscapeClause } from "./like.js";
import { personCardRows } from "./personCards.js";

const currentUserColumns = "id, username, email, role, time_zone AS timeZone, verified_at AS verifiedAt, banned_at AS bannedAt";

type PagedPersonCardRow = PersonCard & {
  createdAt: string;
};

export class HandleReservedError extends Error {
  constructor(readonly reason: "reserved" | "taken" = "taken") {
    super("Profile handle is already reserved.");
  }
}

export type ProfileUpdate = Partial<{
  username: string;
  bioHtml: string;
  skinHtml: string;
  interests: typeof defaultInterests;
  socialLinks: SocialLinks;
  status: typeof defaultStatus;
  pfp: string;
  themeSong: string;
  private: boolean;
}>;

export function getUserByEmail(email: string) {
  const user = sqlite
    .prepare(`SELECT ${currentUserColumns}, password_hash AS passwordHash FROM users WHERE email_canonical = ?`)
    .get(canonicalEmail(email)) as (CurrentUser & { passwordHash: string }) | undefined;
  return normalizeCurrentUser(user);
}

export function getCurrentUser(id: number) {
  const user = sqlite.prepare(`SELECT ${currentUserColumns} FROM users WHERE id = ?`).get(id) as CurrentUser | undefined;
  return normalizeCurrentUser(user);
}

export function getProfile(id: number) {
  const row = sqlite
    .prepare(
      `SELECT u.id, u.username, u.email, u.role, u.time_zone AS timeZone, u.created_at AS createdAt,
        u.verified_at AS verifiedAt, u.banned_at AS bannedAt, p.handle,
        p.bio_html AS bioHtml, p.skin_html AS skinHtml, p.interests_json AS interestsJson,
        p.social_links_json AS socialLinksJson, p.status_json AS statusJson, p.pfp, p.theme_song AS themeSong,
        p.current_group_id AS currentGroupId, p.private, p.views
      FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`
    )
    .get(id) as
    | (Omit<UserProfile, "interests" | "socialLinks" | "status" | "private"> & {
        interestsJson: string;
        socialLinksJson: string;
        statusJson: string;
        private: 0 | 1;
      })
    | undefined;

  if (!row) return undefined;
  return {
    ...row,
    timeZone: normalizeTimeZone(row.timeZone),
    private: Boolean(row.private),
    interests: storedInterests(row.interestsJson),
    socialLinks: normalizeStoredSocialLinks(jsonRecord(row.socialLinksJson)),
    status: storedStatus(row.statusJson)
  } satisfies UserProfile;
}

export function createUser(input: { username: string; email: string; passwordHash: string; handle: string; timeZone: string }) {
  const create = sqlite.transaction(() => {
    const handle = storedHandle(input.handle);
    const email = input.email.trim().toLowerCase();
    const timeZone = normalizeTimeZone(input.timeZone); // Use the passed timezone

    if (handleReservationExists(handle)) throw new HandleReservedError("taken");
    const info = sqlite
      .prepare("INSERT INTO users (username, email, email_canonical, password_hash, time_zone) VALUES (?, ?, ?, ?, ?)")
      .run(input.username, email, canonicalEmail(email), input.passwordHash, timeZone);
    const userId = Number(info.lastInsertRowid);
    if (reservedHandle(handle) && userId !== env.adminUserId) throw new HandleReservedError("reserved");
    sqlite.prepare("INSERT INTO handle_reservations (handle, user_id) VALUES (?, ?)").run(handle, userId);
    sqlite
      .prepare("INSERT INTO profiles (user_id, interests_json, social_links_json, status_json, pfp, handle) VALUES (?, ?, ?, ?, ?, ?)")
      .run(userId, JSON.stringify(defaultInterests), JSON.stringify(defaultSocialLinks), JSON.stringify(defaultStatus), defaultMedia.pfp, handle);
    return userId;
  });
  try {
    const userId = create();
    ensureProtectedAdminFriendship(userId);
    ensureDefaultGroupMembership(userId);
    return userId;
  } catch (error) {
    if (isHandleReservationConflict(error)) throw new HandleReservedError();
    throw error;
  }
}

export function updateProfile(userId: number, input: ProfileUpdate) {
  const update = sqlite.transaction(() => {
    if (input.username) {
      sqlite.prepare("UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(input.username, userId);
    }
    if (input.bioHtml !== undefined) {
      sqlite.prepare("UPDATE profiles SET bio_html = ? WHERE user_id = ?").run(input.bioHtml, userId);
    }
    if (input.skinHtml !== undefined) {
      sqlite.prepare("UPDATE profiles SET skin_html = ? WHERE user_id = ?").run(input.skinHtml, userId);
    }
    if (input.interests) {
      sqlite.prepare("UPDATE profiles SET interests_json = ? WHERE user_id = ?").run(JSON.stringify(input.interests), userId);
    }
    if (input.socialLinks) {
      sqlite.prepare("UPDATE profiles SET social_links_json = ? WHERE user_id = ?").run(JSON.stringify(input.socialLinks), userId);
    }
    if (input.status) {
      sqlite.prepare("UPDATE profiles SET status_json = ? WHERE user_id = ?").run(JSON.stringify(input.status), userId);
    }
    if (input.pfp) sqlite.prepare("UPDATE profiles SET pfp = ? WHERE user_id = ?").run(input.pfp, userId);
    if (input.themeSong) sqlite.prepare("UPDATE profiles SET theme_song = ? WHERE user_id = ?").run(input.themeSong, userId);
    if (input.private !== undefined) sqlite.prepare("UPDATE profiles SET private = ? WHERE user_id = ?").run(input.private ? 1 : 0, userId);
  });
  update();
}

export function profileByHandle(handle: string) {
  const normalized = handle.trim().toLowerCase();
  if (!validHandle(normalized)) return undefined;
  const row = sqlite.prepare("SELECT user_id AS id FROM profiles WHERE handle = ?").get(normalized) as { id: number } | undefined;
  return row ? getProfile(row.id) : undefined;
}

export function profileByProfileImage(filename: string) {
  return profileByMediaColumn("pfp", filename);
}

export function profileByThemeSong(filename: string) {
  return profileByMediaColumn("theme_song", filename);
}

export function handleReserved(handle: string) {
  const normalized = storedHandle(handle);
  return reservedHandle(normalized) || handleReservationExists(normalized);
}

export function updateEmail(userId: number, email: string) {
  const stored = email.trim().toLowerCase();
  sqlite
    .prepare("UPDATE users SET email = ?, email_canonical = ?, verified_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(stored, canonicalEmail(stored), userId);
}

export function updatePassword(userId: number, passwordHash: string) {
  sqlite.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(passwordHash, userId);
}

export function updateTimeZone(userId: number, timeZone: string) {
  sqlite.prepare("UPDATE users SET time_zone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(normalizeTimeZone(timeZone), userId);
}

export function setUserRole(userId: number, role: UserRole) {
  const normalized = normalizeRole(role);
  sqlite.prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(normalized, userId);
}

export function setUserBanned(userId: number, banned: boolean) {
  sqlite.prepare("UPDATE users SET banned_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(banned ? 1 : 0, userId);
}

export function markUserVerified(userId: number) {
  sqlite.prepare("UPDATE users SET verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND verified_at IS NULL").run(userId);
}

export function incrementViews(profileId: number, viewerId?: number) {
  if (viewerId === profileId) return;
  sqlite.prepare("UPDATE profiles SET views = views + 1 WHERE user_id = ?").run(profileId);
}

export function newestUsers(viewer: CurrentUser | null = null, limit = limits.newestPeople) {
  const visible = profileVisibilitySql(viewer);
  return personCardRows(
    `FROM users u
      JOIN profiles p ON p.user_id = u.id
      WHERE ${visible.sql}
      ORDER BY u.created_at DESC LIMIT ?`,
    ...visible.params,
    limit
  );
}

export function searchUsers(query: string, viewer: CurrentUser | null = null, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  const pattern = containsLikePattern(query);
  return personCardRows(
    `FROM users u
      JOIN profiles p ON p.user_id = u.id
      WHERE u.username LIKE ? ${likeEscapeClause} AND ${visible.sql}
      ORDER BY u.username ASC LIMIT ?`,
    pattern,
    ...visible.params,
    limit
  );
}

export function listUsers(viewer: CurrentUser | null = null, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  return personCardRows(
    `FROM users u JOIN profiles p ON p.user_id = u.id
    WHERE ${visible.sql} ORDER BY u.created_at DESC, u.id DESC LIMIT ?`,
    ...visible.params,
    limit
  );
}

export function listUsersPage(viewer: CurrentUser | null = null, options: PageOptions = {}) {
  const limit = normalizePageLimit(options.limit, limits.listPage, limits.listPage);
  const visible = profileVisibilitySql(viewer);
  const before = keysetBeforeCondition(decodeKeysetCursor(options.before), "u.created_at", "u.id");
  const rows = sqlite
    .prepare(
      `SELECT u.id, u.username, p.handle, p.pfp, u.created_at AS createdAt
      FROM users u JOIN profiles p ON p.user_id = u.id
      WHERE ${visible.sql}
      ${before.sql}
      ORDER BY u.created_at DESC, u.id DESC LIMIT ?`
    )
    .all(...visible.params, ...before.params, limit + 1) as PagedPersonCardRow[];
  return pageFromRows(rows, limit);
}

export function deleteAccount(userId: number) {
  sqlite.prepare("DELETE FROM users WHERE id = ?").run(userId);
}

function storedHandle(handle: string) {
  const normalized = handle.trim().toLowerCase();
  if (!validHandle(normalized)) throw new Error("Invalid profile handle.");
  return normalized;
}

function handleReservationExists(handle: string) {
  return Boolean(sqlite.prepare("SELECT 1 FROM handle_reservations WHERE handle = ?").get(handle));
}

function profileByMediaColumn(column: "pfp" | "theme_song", filename: string) {
  const row = sqlite.prepare(`SELECT user_id AS id FROM profiles WHERE ${column} = ? LIMIT 1`).get(filename) as { id: number } | undefined;
  return row ? getProfile(row.id) : undefined;
}

function isHandleReservationConflict(error: unknown) {
  return error instanceof Error && error.message.includes("handle_reservations.handle");
}

function jsonRecord(value: string) {
  try {
    return recordFromUnknown(JSON.parse(value));
  } catch {
    return {};
  }
}

function storedInterests(value: string) {
  const record = jsonRecord(value);
  const interests = { ...defaultInterests };
  for (const name of defaultInterestNames) {
    interests[name] = stringFromUnknown(record[name]);
  }
  return interests;
}

function storedStatus(value: string) {
  const record = jsonRecord(value);
  return {
    status: stringFromUnknown(record.status),
    currentVibe: stringFromUnknown(record.currentVibe)
  };
}

function normalizeCurrentUser<T extends CurrentUser>(user: T | undefined) {
  return user ? { ...user, timeZone: normalizeTimeZone(user.timeZone) } : undefined;
}
