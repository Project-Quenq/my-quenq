import { sqlite } from "./client.js";
import { limits } from "../../policy.js";
import { profileVisibilitySql } from "./profileVisibility.js";
import type { CurrentUser } from "../../currentUser.js";
import type { CommentItem } from "../../models.js";

const targets = {
  blog: {
    table: "blog_comments",
    column: "blog_id",
    ownerJoin: "JOIN blogs owner ON owner.id = c.blog_id",
    ownerSelect: "owner.author_id AS ownerId"
  },
  post: {
    table: "post_comments",
    column: "post_id",
    ownerJoin: "JOIN posts owner ON owner.id = c.post_id LEFT JOIN groups g ON g.id = owner.group_id",
    ownerSelect: "owner.author_id AS ownerId, owner.wall_user_id AS wallOwnerId, g.owner_id AS groupOwnerId"
  },
  skin: {
    table: "skin_comments",
    column: "skin_id",
    ownerJoin: "JOIN skins owner ON owner.id = c.skin_id",
    ownerSelect: "owner.author_id AS ownerId"
  }
} as const;

export type CommentTarget = keyof typeof targets;
type CommentTable = (typeof targets)[CommentTarget]["table"];

type CommentOwnerRow = {
  authorId: number;
  groupOwnerId?: number | null;
  ownerId: number | null;
  wallOwnerId?: number | null;
};

type ReplyTargetRow = {
  replyParentId: number | null;
  targetParentId: number;
};

type CommentListOptions = {
  limit?: number;
  order?: "newest" | "oldest";
  viewer?: CurrentUser | null;
};

const commentColumns = `c.id, c.text_html AS textHtml, c.created_at AS createdAt, c.parent_id AS parentId,
  u.id AS authorId, u.role AS authorRole, p.handle AS authorHandle, p.skin_html AS authorSkinHtml, u.username, p.pfp`;
const commentAuthorJoin = `JOIN users u ON u.id = c.author_id
  JOIN profiles p ON p.user_id = u.id`;

function commentRows(tail: string, ...params: unknown[]) {
  return sqlite.prepare(`SELECT ${commentColumns} ${tail}`).all(...params) as CommentItem[];
}

export function commentRowsFrom(table: CommentTable, tail: string, ...params: unknown[]) {
  return commentRows(
    `FROM ${table} c
      ${commentAuthorJoin}
      ${tail}`,
    ...params
  );
}

export function commentsFor(target: CommentTarget, parentId: number, options: CommentListOptions = {}) {
  const source = targets[target];
  const authorVisible = profileVisibilitySql(options.viewer ?? null);
  const parentAuthorVisible = profileVisibilitySql(options.viewer ?? null, { user: "parent_author", profile: "parent_profile" });
  const threadOrder = options.order === "oldest" ? "ASC" : "DESC";
  return commentRowsFrom(
    source.table,
    `WHERE c.${source.column} = ? AND ${authorVisible.sql}
      AND (
        c.parent_id IS NULL OR EXISTS (
          SELECT 1 FROM ${source.table} parent_comment
          JOIN users parent_author ON parent_author.id = parent_comment.author_id
          JOIN profiles parent_profile ON parent_profile.user_id = parent_author.id
          WHERE parent_comment.id = c.parent_id
            AND parent_comment.${source.column} = c.${source.column}
            AND ${parentAuthorVisible.sql}
        )
      )
      ORDER BY COALESCE(c.parent_id, c.id) ${threadOrder}, c.parent_id IS NOT NULL ASC, c.created_at ASC, c.id ASC LIMIT ?`,
    parentId,
    ...authorVisible.params,
    ...parentAuthorVisible.params,
    options.limit ?? limits.exportRows
  );
}

export function addComment(
  target: CommentTarget,
  parentId: number,
  authorId: number,
  textHtml: string,
  replyTo?: number,
  viewer: CurrentUser | null = null
): number | null {
  const source = targets[target];
  const parentCommentId = topLevelReplyParentId(source, parentId, replyTo, viewer);
  if (parentCommentId === undefined) return null;
  const info = sqlite
    .prepare(`INSERT INTO ${source.table} (${source.column}, author_id, text_html, parent_id) VALUES (?, ?, ?, ?)`)
    .run(parentId, authorId, textHtml, parentCommentId);
  return Number(info.lastInsertRowid);
}

export function deleteComment(target: CommentTarget, commentId: number, actorId: number, isAdmin = false) {
  const source = targets[target];
  const row = sqlite
    .prepare(
      `SELECT c.author_id AS authorId, ${source.ownerSelect}
      FROM ${source.table} c ${source.ownerJoin}
      WHERE c.id = ?`
    )
    .get(commentId) as CommentOwnerRow | undefined;
  if (!row || (!isAdmin && !commentOwnerIds(row).includes(actorId))) return false;
  return sqlite.prepare(`DELETE FROM ${source.table} WHERE id = ?`).run(commentId).changes > 0;
}

export function commentParentId(target: CommentTarget, commentId: number, viewer: CurrentUser | null = null) {
  const source = targets[target];
  const visible = profileVisibilitySql(viewer);
  const parentVisible = profileVisibilitySql(viewer, { user: "parent_author", profile: "parent_profile" });
  const row = sqlite
    .prepare(
      `SELECT c.${source.column} AS parentId FROM ${source.table} c
      JOIN users u ON u.id = c.author_id
      JOIN profiles p ON p.user_id = u.id
      WHERE c.id = ? AND ${visible.sql}
        AND (
          c.parent_id IS NULL OR EXISTS (
            SELECT 1 FROM ${source.table} parent_comment
            JOIN users parent_author ON parent_author.id = parent_comment.author_id
            JOIN profiles parent_profile ON parent_profile.user_id = parent_author.id
            WHERE parent_comment.id = c.parent_id
              AND parent_comment.${source.column} = c.${source.column}
              AND ${parentVisible.sql}
          )
        )`
    )
    .get(commentId, ...visible.params, ...parentVisible.params) as { parentId: number } | undefined;
  return row?.parentId;
}

function topLevelReplyParentId(
  source: (typeof targets)[CommentTarget],
  parentId: number,
  replyTo: number | undefined,
  viewer: CurrentUser | null
) {
  if (replyTo === undefined) return null;
  const visible = profileVisibilitySql(viewer);
  const row = sqlite
    .prepare(
      `SELECT c.${source.column} AS targetParentId, c.parent_id AS replyParentId
      FROM ${source.table} c
      JOIN users u ON u.id = c.author_id
      JOIN profiles p ON p.user_id = u.id
      WHERE c.id = ? AND ${visible.sql}`
    )
    .get(replyTo, ...visible.params) as ReplyTargetRow | undefined;
  return row?.targetParentId === parentId && row.replyParentId === null ? replyTo : undefined;
}

function commentOwnerIds(row: CommentOwnerRow) {
  return [row.authorId, row.ownerId, row.wallOwnerId, row.groupOwnerId].filter((id): id is number => typeof id === "number");
}
