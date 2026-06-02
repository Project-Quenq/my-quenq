import { sqlite } from "./client.js";
import { limits } from "../../policy.js";
import { addComment, commentsFor, deleteComment } from "./comments.js";
import { profileVisibilitySql } from "./profileVisibility.js";
import type { CurrentUser } from "../../currentUser.js";
import type { SkinItem } from "../../models.js";
import { containsLikePattern, likeEscapeClause } from "./like.js";
import { builtinSkinDefinitions, builtinSkinOrderSql } from "../../skins/builtin.js";

const skinColumns = `s.id, s.source_key AS sourceKey, s.title, s.description_html AS descriptionHtml, s.code_html AS codeHtml,
  s.created_at AS createdAt, s.updated_at AS updatedAt, u.id AS authorId,
  COALESCE(u.role, 'user') AS authorRole, COALESCE(p.handle, '') AS authorHandle, COALESCE(u.username, '') AS username`;

const skinCommentCountSql = (commentVisibilitySql: string, parentCommentVisibilitySql: string) => `(
  SELECT COUNT(*)
  FROM skin_comments comments
  JOIN users comment_author ON comment_author.id = comments.author_id
  JOIN profiles comment_profile ON comment_profile.user_id = comment_author.id
  WHERE comments.skin_id = s.id
    AND ${commentVisibilitySql}
    AND (
      comments.parent_id IS NULL OR EXISTS (
        SELECT 1 FROM skin_comments parent_comment
        JOIN users parent_author ON parent_author.id = parent_comment.author_id
        JOIN profiles parent_profile ON parent_profile.user_id = parent_author.id
        WHERE parent_comment.id = comments.parent_id
          AND parent_comment.skin_id = comments.skin_id
          AND ${parentCommentVisibilitySql}
      )
    )
)`;

export function listSkins(viewer: CurrentUser | null = null, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  return skinRows(
    viewer,
    `WHERE s.source_key IS NOT NULL OR (${visible.sql})
    ORDER BY CASE WHEN s.source_key IS NOT NULL THEN 0 ELSE 1 END, ${builtinSkinOrderSql("s.source_key")}, commentCount DESC, s.updated_at DESC, s.id DESC LIMIT ?`,
    ...visible.params,
    limit
  );
}

export function searchSkins(query: string, viewer: CurrentUser | null = null, limit = limits.listPage) {
  const pattern = containsLikePattern(query);
  const visible = profileVisibilitySql(viewer);
  return skinRows(
    viewer,
    `WHERE (s.source_key IS NOT NULL OR (${visible.sql})) AND (s.title LIKE ? ${likeEscapeClause} OR s.description_html LIKE ? ${likeEscapeClause})
    ORDER BY CASE WHEN s.source_key IS NOT NULL THEN 0 ELSE 1 END, ${builtinSkinOrderSql("s.source_key")}, s.updated_at DESC LIMIT ?`,
    ...visible.params,
    pattern,
    pattern,
    limit
  );
}

export function skinsForUser(userId: number, limit = limits.exportRows) {
  return skinRows(null, "WHERE s.author_id = ? AND u.banned_at IS NULL ORDER BY s.updated_at DESC LIMIT ?", userId, limit);
}

export function getSkin(id: number) {
  return skinRows(null, "WHERE s.id = ? AND (s.source_key IS NOT NULL OR (u.id IS NOT NULL AND u.banned_at IS NULL))", id)[0];
}

export function createSkin(authorId: number, title: string, descriptionHtml: string, codeHtml: string) {
  const info = sqlite
    .prepare("INSERT INTO skins (author_id, title, description_html, code_html) VALUES (?, ?, ?, ?)")
    .run(authorId, title, descriptionHtml, codeHtml);
  return Number(info.lastInsertRowid);
}

export function installBuiltinSkins() {
  const upsert = sqlite.prepare(
    `INSERT INTO skins (source_key, title, description_html, code_html)
    VALUES (@sourceKey, @title, @descriptionHtml, @codeHtml)
    ON CONFLICT(source_key) DO UPDATE SET
      author_id = NULL,
      title = excluded.title,
      description_html = excluded.description_html,
      code_html = excluded.code_html,
      updated_at = CASE
        WHEN skins.author_id IS NULL
          AND skins.title = excluded.title
          AND skins.description_html = excluded.description_html
          AND skins.code_html = excluded.code_html
        THEN skins.updated_at
        ELSE CURRENT_TIMESTAMP
      END`
  );
  const install = sqlite.transaction(() => {
    for (const skin of builtinSkinDefinitions) upsert.run(skin);
  });
  install();
  return true;
}

export function updateSkin(authorId: number | null, skinId: number, title: string, descriptionHtml: string, codeHtml: string) {
  const ownerFilter = authorId === null ? "author_id IS NULL" : "author_id = ?";
  const params = authorId === null ? [title, descriptionHtml, codeHtml, skinId] : [title, descriptionHtml, codeHtml, skinId, authorId];
  const info = sqlite
    .prepare(`UPDATE skins SET title = ?, description_html = ?, code_html = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND ${ownerFilter}`)
    .run(...params);
  return info.changes > 0;
}

export function deleteSkin(skinId: number, actorId: number, isAdmin = false) {
  const info = isAdmin
    ? sqlite.prepare("DELETE FROM skins WHERE id = ?").run(skinId)
    : sqlite.prepare("DELETE FROM skins WHERE id = ? AND author_id = ?").run(skinId, actorId);
  return info.changes > 0;
}

export function skinCommentsFor(skinId: number, viewer: CurrentUser | null = null, limit?: number) {
  return commentsFor("skin", skinId, { viewer, limit });
}

export function addSkinComment(skinId: number, authorId: number, textHtml: string, parentId?: number, viewer: CurrentUser | null = null): number | null {
  return addComment("skin", skinId, authorId, textHtml, parentId, viewer);
}

export function deleteSkinComment(commentId: number, actorId: number, isAdmin = false) {
  return deleteComment("skin", commentId, actorId, isAdmin);
}

function skinRows(viewer: CurrentUser | null, tail: string, ...params: unknown[]) {
  const visibleComments = profileVisibilitySql(viewer, { user: "comment_author", profile: "comment_profile" });
  const visibleParentComments = profileVisibilitySql(viewer, { user: "parent_author", profile: "parent_profile" });
  return sqlite
    .prepare(
      `SELECT ${skinColumns}, ${skinCommentCountSql(visibleComments.sql, visibleParentComments.sql)} AS commentCount
      FROM skins s LEFT JOIN users u ON u.id = s.author_id LEFT JOIN profiles p ON p.user_id = u.id ${tail}`
    )
    .all(...visibleComments.params, ...visibleParentComments.params, ...params) as SkinItem[];
}
