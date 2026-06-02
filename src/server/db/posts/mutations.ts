import { friendshipStatus } from "../../../policy.js";
import { sqlite } from "../client.js";
import { isGroupMember } from "../groups.js";
import type { PostItem } from "../../../models.js";

export function createWallPost(authorId: number, wallUserId: number, bodyHtml: string, mediaFilename?: string | null) {
  const info = sqlite
    .prepare("INSERT INTO posts (author_id, wall_user_id, body_html, media_filename) VALUES (?, ?, ?, ?)")
    .run(authorId, wallUserId, bodyHtml, mediaFilename ?? null);
  return Number(info.lastInsertRowid);
}

export function createGroupPost(authorId: number, groupId: number, bodyHtml: string, mediaFilename?: string | null) {
  const info = sqlite
    .prepare("INSERT INTO posts (author_id, group_id, body_html, media_filename) VALUES (?, ?, ?, ?)")
    .run(authorId, groupId, bodyHtml, mediaFilename ?? null);
  return Number(info.lastInsertRowid);
}

export function canPostToWall(authorId: number, wallUserId: number) {
  if (authorId === wallUserId) return true;
  return Boolean(
    sqlite
      .prepare(
        `SELECT 1 FROM friendships f
        WHERE f.status = ?
          AND ((f.sender_id = ? AND f.receiver_id = ?) OR (f.sender_id = ? AND f.receiver_id = ?))
          AND NOT EXISTS (
            SELECT 1 FROM user_blocks b
            WHERE (b.blocker_id = ? AND b.blocked_id = ?) OR (b.blocker_id = ? AND b.blocked_id = ?)
          )
        LIMIT 1`
      )
      .get(friendshipStatus.accepted, authorId, wallUserId, wallUserId, authorId, authorId, wallUserId, wallUserId, authorId)
  );
}

export function canPostToGroup(authorId: number, groupId: number) {
  return isGroupMember(groupId, authorId);
}

export function canInteractWithPost(post: PostItem, userId: number) {
  return post.groupId ? isGroupMember(post.groupId, userId) : true;
}

export function deletePost(postId: number, actorId: number, isAdmin = false) {
  const row = sqlite
    .prepare(
      `SELECT po.author_id AS authorId, po.wall_user_id AS wallUserId,
        g.owner_id AS groupOwnerId, po.media_filename AS mediaFilename
      FROM posts po LEFT JOIN groups g ON g.id = po.group_id
      WHERE po.id = ?`
    )
    .get(postId) as { authorId: number; wallUserId: number | null; groupOwnerId: number | null; mediaFilename: string | null } | undefined;
  if (!row || (!isAdmin && actorId !== row.authorId && actorId !== row.wallUserId && actorId !== row.groupOwnerId)) return false;
  return sqlite.prepare("DELETE FROM posts WHERE id = ?").run(postId).changes > 0 ? row.mediaFilename ?? null : false;
}

export function addPostProp(postId: number, userId: number) {
  return sqlite.prepare("INSERT OR IGNORE INTO post_props (post_id, user_id) VALUES (?, ?)").run(postId, userId).changes > 0;
}

export function removePostProp(postId: number, userId: number) {
  sqlite.prepare("DELETE FROM post_props WHERE post_id = ? AND user_id = ?").run(postId, userId);
}
