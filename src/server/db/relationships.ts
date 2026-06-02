import { sqlite } from "./client.js";
import { friendshipStatus, limits } from "../../policy.js";
import { profileVisibilitySql } from "./profileVisibility.js";
import { personCardRows } from "./personCards.js";
import { env } from "../env.js";
import type { CurrentUser } from "../../currentUser.js";
import type { Friendship } from "../../models.js";

export function friendshipBetween(a: number, b: number) {
  return sqlite
    .prepare(
      `SELECT id, sender_id, receiver_id, status FROM friendships
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      LIMIT 1`
    )
    .get(a, b, b, a) as Friendship | undefined;
}

export function requestFriend(senderId: number, receiverId: number) {
  if (senderId === receiverId) return;
  if (isProtectedAdminFriendship(senderId, receiverId)) {
    ensureProtectedAdminFriendship(senderId === env.adminUserId ? receiverId : senderId);
    return;
  }
  if (isBlockedBetween(senderId, receiverId)) return;
  const existing = friendshipBetween(senderId, receiverId);
  if (existing) {
    if (existing.status === friendshipStatus.pending && existing.sender_id === receiverId && existing.receiver_id === senderId) {
      return acceptFriend(receiverId, senderId) ? "accepted" : undefined;
    }
    return;
  }
  sqlite.prepare("INSERT INTO friendships (sender_id, receiver_id, status) VALUES (?, ?, ?)").run(senderId, receiverId, friendshipStatus.pending);
  return "requested";
}

export function acceptFriend(senderId: number, receiverId: number) {
  return sqlite
    .prepare(
      "UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND receiver_id = ? AND status = ?"
    )
    .run(friendshipStatus.accepted, senderId, receiverId, friendshipStatus.pending).changes > 0;
}

export function removeFriend(a: number, b: number) {
  if (isProtectedAdminFriendship(a, b)) {
    ensureProtectedAdminFriendship(a === env.adminUserId ? b : a);
    return false;
  }
  return sqlite
    .prepare("DELETE FROM friendships WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)")
    .run(a, b, b, a).changes > 0;
}

export function friendsFor(userId: number, limit = limits.listPage) {
  return personCardRows(
    `FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.sender_id = ? THEN f.receiver_id ELSE f.sender_id END
    JOIN profiles p ON p.user_id = u.id
    WHERE (f.sender_id = ? OR f.receiver_id = ?) AND f.status = ? AND u.banned_at IS NULL
    ORDER BY f.updated_at DESC LIMIT ?`,
    userId,
    userId,
    userId,
    friendshipStatus.accepted,
    limit
  );
}

export function visibleFriendsFor(userId: number, viewer: CurrentUser | null, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  return personCardRows(
    `FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.sender_id = ? THEN f.receiver_id ELSE f.sender_id END
    JOIN profiles p ON p.user_id = u.id
    WHERE (f.sender_id = ? OR f.receiver_id = ?) AND f.status = ? AND ${visible.sql}
    ORDER BY f.updated_at DESC LIMIT ?`,
    userId,
    userId,
    userId,
    friendshipStatus.accepted,
    ...visible.params,
    limit
  );
}

export function friendCountFor(userId: number, viewer: CurrentUser | null = null) {
  const visible = profileVisibilitySql(viewer);
  return (
    sqlite
      .prepare(
        `SELECT COUNT(*) AS count FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.sender_id = ? THEN f.receiver_id ELSE f.sender_id END
        JOIN profiles p ON p.user_id = u.id
        WHERE (f.sender_id = ? OR f.receiver_id = ?) AND f.status = ? AND ${visible.sql}`
      )
      .get(userId, userId, userId, friendshipStatus.accepted, ...visible.params) as { count: number }
  ).count;
}

export function pendingRequestsFor(userId: number, limit = limits.listPage) {
  return personCardRows(
    `FROM friendships f
      JOIN users u ON u.id = f.sender_id
      JOIN profiles p ON p.user_id = u.id
      WHERE f.receiver_id = ? AND f.status = ? AND u.banned_at IS NULL
      ORDER BY f.created_at DESC LIMIT ?`,
    userId,
    friendshipStatus.pending,
    limit
  );
}

export function addFavorite(userId: number, favoriteId: number) {
  if (userId === favoriteId) return false;
  return sqlite.prepare("INSERT OR IGNORE INTO favorites (user_id, favorite_id) VALUES (?, ?)").run(userId, favoriteId).changes > 0;
}

export function favoriteUsers(userId: number, viewer: CurrentUser | null = null, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  return personCardRows(
    `FROM favorites f
      JOIN users u ON u.id = f.favorite_id
      JOIN profiles p ON p.user_id = u.id
      WHERE f.user_id = ? AND ${visible.sql} ORDER BY f.created_at DESC LIMIT ?`,
    userId,
    ...visible.params,
    limit
  );
}

export function removeFavorite(userId: number, favoriteId: number) {
  sqlite.prepare("DELETE FROM favorites WHERE user_id = ? AND favorite_id = ?").run(userId, favoriteId);
}

export function sentRequestsFor(userId: number, limit = limits.listPage) {
  return personCardRows(
    `FROM friendships f
      JOIN users u ON u.id = f.receiver_id
      JOIN profiles p ON p.user_id = u.id
      WHERE f.sender_id = ? AND f.status = ? AND u.banned_at IS NULL
      ORDER BY f.created_at DESC LIMIT ?`,
    userId,
    friendshipStatus.pending,
    limit
  );
}

export function blockUser(blockerId: number, blockedId: number) {
  if (blockerId === blockedId) return;
  if (isProtectedAdminFriendship(blockerId, blockedId)) {
    ensureProtectedAdminFriendship(blockerId === env.adminUserId ? blockedId : blockerId);
    return;
  }
  sqlite.transaction(() => {
    sqlite.prepare("INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)").run(blockerId, blockedId);
    removeFriend(blockerId, blockedId);
  })();
}

export function unblockUser(blockerId: number, blockedId: number) {
  sqlite.prepare("DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?").run(blockerId, blockedId);
}

export function blockedUsers(userId: number, limit = limits.listPage) {
  return personCardRows(
    `FROM user_blocks b
      JOIN users u ON u.id = b.blocked_id
      JOIN profiles p ON p.user_id = u.id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC LIMIT ?`,
    userId,
    limit
  );
}

export function isBlockedBetween(a: number, b: number) {
  return Boolean(
    sqlite
      .prepare(
        `SELECT 1 FROM user_blocks
        WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
        LIMIT 1`
      )
      .get(a, b, b, a)
  );
}

export function hasBlocked(blockerId: number, blockedId: number) {
  return Boolean(sqlite.prepare("SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?").get(blockerId, blockedId));
}

function isProtectedAdminFriendship(a: number, b: number) {
  return a !== b && (a === env.adminUserId || b === env.adminUserId);
}

export function ensureProtectedAdminFriendship(userId: number) {
  if (userId === env.adminUserId) return;
  sqlite.transaction(() => {
    sqlite
      .prepare("DELETE FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)")
      .run(env.adminUserId, userId, userId, env.adminUserId);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO friendships (sender_id, receiver_id, status)
        SELECT ?, u.id, ? FROM users u
        WHERE u.id = ? AND u.id <> ? AND EXISTS (SELECT 1 FROM users admin WHERE admin.id = ?)`
      )
      .run(env.adminUserId, friendshipStatus.accepted, userId, env.adminUserId, env.adminUserId);
    sqlite
      .prepare(
        `UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE status <> ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))`
      )
      .run(friendshipStatus.accepted, friendshipStatus.accepted, env.adminUserId, userId, userId, env.adminUserId);
  })();
}

export function ensureProtectedAdminFriendships() {
  if (!sqlite.prepare("SELECT 1 FROM users WHERE id = ?").get(env.adminUserId)) return;
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?").run(env.adminUserId, env.adminUserId);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO friendships (sender_id, receiver_id, status)
        SELECT ?, u.id, ? FROM users u WHERE u.id <> ?`
      )
      .run(env.adminUserId, friendshipStatus.accepted, env.adminUserId);
    sqlite
      .prepare(
        `UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE status <> ? AND (sender_id = ? OR receiver_id = ?)`
      )
      .run(friendshipStatus.accepted, friendshipStatus.accepted, env.adminUserId, env.adminUserId);
  })();
}
