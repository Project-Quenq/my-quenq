import { limits } from "../../policy.js";
import { sqlite } from "./client.js";
import type { FavoriteEdge, StaffUserRow, TableCount } from "../../models.js";
import { blogRows } from "./blogs/sql.js";
import { containsLikePattern, likeEscapeClause } from "./like.js";

const staffUserColumns = `u.id, u.username, u.email, u.role, u.verified_at AS verifiedAt,
  u.banned_at AS bannedAt, u.created_at AS createdAt, p.handle, p.pfp, p.views`;

const countedTables = [
  "app_settings",
  "users",
  "handle_reservations",
  "profiles",
  "sessions",
  "rate_limit_counters",
  "rate_limit_settings",
  "friendships",
  "favorites",
  "blogs",
  "blog_comments",
  "blog_props",
  "groups",
  "group_members",
  "posts",
  "post_props",
  "post_comments",
  "messages",
  "notification_preferences",
  "notifications",
  "skins",
  "skin_comments",
  "user_blocks",
  "reset_tokens",
  "verification_tokens",
  "reports",
  "automod_rules",
  "email_outbox",
  "audit_log"
];

export function staffUserRows(limit = limits.listPage) {
  return staffUserRowsFrom("ORDER BY u.created_at DESC LIMIT ?", limit);
}

export function searchStaffUserRows(query: string, limit = limits.listPage) {
  const pattern = containsLikePattern(query);
  return staffUserRowsFrom(
    `WHERE u.username LIKE ? ${likeEscapeClause}
    OR u.email LIKE ? ${likeEscapeClause}
    OR CAST(u.id AS TEXT) = ? ORDER BY u.created_at DESC LIMIT ?`,
    pattern,
    pattern,
    query,
    limit
  );
}

function staffUserRowsFrom(tail: string, ...params: unknown[]) {
  return sqlite
    .prepare(`SELECT ${staffUserColumns} FROM users u JOIN profiles p ON p.user_id = u.id ${tail}`)
    .all(...params) as StaffUserRow[];
}

export function staffBlogRows(limit = limits.listPage) {
  return blogRows("ORDER BY b.created_at DESC LIMIT ?", staffViewer(), limit);
}

function staffViewer() {
  return {
    id: 0,
    username: "staff",
    email: "",
    role: "admin",
    timeZone: "UTC",
    verifiedAt: null,
    bannedAt: null
  } as const;
}

export function staffFavoriteEdges(limit = limits.listPage) {
  return sqlite
    .prepare(
      `SELECT owner.id AS userId, owner.username, ownerProfile.handle AS userHandle,
        favorite.id AS favoriteId, favorite.username AS favoriteName, favoriteProfile.handle AS favoriteHandle,
        f.created_at AS createdAt
      FROM favorites f
      JOIN users owner ON owner.id = f.user_id
      JOIN profiles ownerProfile ON ownerProfile.user_id = owner.id
      JOIN users favorite ON favorite.id = f.favorite_id
      JOIN profiles favoriteProfile ON favoriteProfile.user_id = favorite.id
      ORDER BY f.created_at DESC LIMIT ?`
    )
    .all(limit) as FavoriteEdge[];
}

export function removeFavoriteEdge(userId: number, favoriteId: number) {
  return sqlite.prepare("DELETE FROM favorites WHERE user_id = ? AND favorite_id = ?").run(userId, favoriteId).changes > 0;
}

export function databaseTableCounts() {
  return countedTables.map((name) => {
    const row = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get() as { count: number };
    return { name, count: row.count };
  }) satisfies TableCount[];
}
