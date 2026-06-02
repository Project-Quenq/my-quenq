import { HTTPException } from "hono/http-exception";
import { currentUser } from "./auth/session.js";
import { getBlog } from "./db/blogs/index.js";
import { canViewGroup, getGroup } from "./db/groups.js";
import { getSkin } from "./db/skins.js";
import { friendshipBetween, isBlockedBetween } from "./db/relationships.js";
import type { Friendship, UserProfile } from "../models.js";
import { getProfile } from "./db/users.js";
import { friendshipStatus } from "../policy.js";
import { canBypassVisibility, canViewReports, isAdminUser } from "../roles.js";
import type { CurrentUser } from "../currentUser.js";
import type { AppContext } from "./context.js";

export function requireAuth(c: AppContext) {
  const user = currentUser(c);
  if (!user) throw new HTTPException(302, { res: c.redirect("/login") });
  return user;
}

export function requireAdmin(c: AppContext) {
  const user = requireAuth(c);
  if (!isAdminUser(user)) throw new HTTPException(403, { message: "Admin access required." });
  return user;
}

export function requireModerator(c: AppContext) {
  const user = requireAuth(c);
  if (!canViewReports(user)) throw new HTTPException(403, { message: "Moderation access required." });
  return user;
}

function canManage(user: CurrentUser, ownerId: number) {
  return user.id === ownerId || isAdminUser(user);
}

export function requireOwnerOrAdmin(user: CurrentUser, ownerId: number, message: string) {
  if (!canManage(user, ownerId)) throw new HTTPException(403, { message });
}

export function requireProfile(id: number) {
  const profile = getProfile(id);
  if (!profile) throw new HTTPException(404, { message: "User not found." });
  return profile;
}

export function visibleProfile(c: AppContext, id: number) {
  const profile = requireProfile(id);
  const user = currentUser(c);
  if (profile.bannedAt && !canBypassVisibility(user)) {
    throw new HTTPException(404, { message: "User not found." });
  }
  if (user && user.id !== id && !canBypassVisibility(user) && isBlockedBetween(user.id, id)) {
    throw new HTTPException(403, { message: "This profile is unavailable." });
  }
  const friendship = user ? friendshipBetween(user.id, id) : undefined;
  if (!canViewProfile(user, profile, friendship)) {
    throw new HTTPException(403, { message: "This profile is private." });
  }
  return { profile, user, friendship };
}

function canViewProfile(user: CurrentUser | null, profile: UserProfile, friendship?: Friendship) {
  if (profile.bannedAt && !canBypassVisibility(user)) return false;
  if (!profile.private) return true;
  if (!user) return false;
  return user.id === profile.id || canBypassVisibility(user) || friendship?.status === friendshipStatus.accepted;
}

export function requireBlog(id: number, viewer: CurrentUser | null = null) {
  const blog = getBlog(id, viewer);
  if (!blog) throw new HTTPException(404, { message: "Blog not found." });
  return blog;
}

export function requireGroup(id: number) {
  const group = getGroup(id);
  if (!group) throw new HTTPException(404, { message: "Group not found." });
  return group;
}

export function visibleGroup(c: AppContext, id: number) {
  const group = requireGroup(id);
  const user = requireAuth(c);
  visibleProfile(c, group.ownerId);
  if (!canViewGroup(user, group.id)) throw new HTTPException(404, { message: "Group not found." });
  return { group, user };
}

export function requireSkin(id: number) {
  const skin = getSkin(id);
  if (!skin) throw new HTTPException(404, { message: "Skin not found." });
  return skin;
}
