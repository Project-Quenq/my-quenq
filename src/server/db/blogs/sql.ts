import type { CurrentUser } from "../../../currentUser.js";
import { sqlite } from "../client.js";
import { profileVisibilitySql } from "../profileVisibility.js";
import type { BlogItem, BlogPreview } from "../../../models.js";

const blogCommentCountSql = (commentVisibilitySql: string, parentCommentVisibilitySql: string) => `(
    SELECT COUNT(*)
    FROM blog_comments comments
    JOIN users comment_author ON comment_author.id = comments.author_id
    JOIN profiles comment_profile ON comment_profile.user_id = comment_author.id
    WHERE comments.blog_id = b.id
      AND ${commentVisibilitySql}
      AND (
        comments.parent_id IS NULL OR EXISTS (
          SELECT 1 FROM blog_comments parent_comment
          JOIN users parent_author ON parent_author.id = parent_comment.author_id
          JOIN profiles parent_profile ON parent_profile.user_id = parent_author.id
          WHERE parent_comment.id = comments.parent_id
            AND parent_comment.blog_id = comments.blog_id
            AND ${parentCommentVisibilitySql}
        )
      )
  )`;

const blogColumns = (propVisibilitySql: string, commentVisibilitySql: string, parentCommentVisibilitySql: string) => `b.id, b.title, b.body_html AS bodyHtml, b.created_at AS createdAt, b.updated_at AS updatedAt,
  u.id AS authorId, u.role AS authorRole, p.handle AS authorHandle, u.username, b.category, b.privacy_level AS privacyLevel,
  b.pinned,
  (
    SELECT COUNT(*)
    FROM blog_props props
    JOIN users prop_user ON prop_user.id = props.user_id
    JOIN profiles prop_profile ON prop_profile.user_id = prop_user.id
    WHERE props.blog_id = b.id AND ${propVisibilitySql}
  ) AS propsCount,
  ${blogCommentCountSql(commentVisibilitySql, parentCommentVisibilitySql)} AS commentCount,
  EXISTS(SELECT 1 FROM blog_props own_prop WHERE own_prop.blog_id = b.id AND own_prop.user_id = ?) AS proppedByViewer,
  b.comments_enabled AS commentsEnabled`;

const blogPreviewColumns = (propVisibilitySql: string, commentVisibilitySql: string, parentCommentVisibilitySql: string) => `b.id, b.title, b.body_html AS bodyHtml, b.created_at AS createdAt, b.updated_at AS updatedAt,
  b.category, b.privacy_level AS privacyLevel, b.pinned,
  (
    SELECT COUNT(*)
    FROM blog_props props
    JOIN users prop_user ON prop_user.id = props.user_id
    JOIN profiles prop_profile ON prop_profile.user_id = prop_user.id
    WHERE props.blog_id = b.id AND ${propVisibilitySql}
  ) AS propsCount,
  ${blogCommentCountSql(commentVisibilitySql, parentCommentVisibilitySql)} AS commentCount,
  EXISTS(SELECT 1 FROM blog_props own_prop WHERE own_prop.blog_id = b.id AND own_prop.user_id = ?) AS proppedByViewer,
  b.comments_enabled AS commentsEnabled`;

const blogFrom = `FROM blogs b
  JOIN users u ON u.id = b.author_id
  JOIN profiles p ON p.user_id = u.id`;

export function blogRows(tail: string, viewer: CurrentUser | null, ...params: unknown[]) {
  const visibleProps = profileVisibilitySql(viewer, { user: "prop_user", profile: "prop_profile" });
  const visibleComments = profileVisibilitySql(viewer, { user: "comment_author", profile: "comment_profile" });
  const visibleParentComments = profileVisibilitySql(viewer, { user: "parent_author", profile: "parent_profile" });
  return sqlite
    .prepare(`SELECT ${blogColumns(visibleProps.sql, visibleComments.sql, visibleParentComments.sql)} ${blogFrom} ${tail}`)
    .all(...visibleProps.params, ...visibleComments.params, ...visibleParentComments.params, viewerId(viewer), ...params) as BlogItem[];
}

export function blogPreviewRows(tail: string, viewer: CurrentUser | null, ...params: unknown[]) {
  const visibleProps = profileVisibilitySql(viewer, { user: "prop_user", profile: "prop_profile" });
  const visibleComments = profileVisibilitySql(viewer, { user: "comment_author", profile: "comment_profile" });
  const visibleParentComments = profileVisibilitySql(viewer, { user: "parent_author", profile: "parent_profile" });
  return sqlite
    .prepare(`SELECT ${blogPreviewColumns(visibleProps.sql, visibleComments.sql, visibleParentComments.sql)} FROM blogs b ${tail}`)
    .all(...visibleProps.params, ...visibleComments.params, ...visibleParentComments.params, viewerId(viewer), ...params) as BlogPreview[];
}

export function viewerId(viewer: CurrentUser | null) {
  return viewer?.id ?? 0;
}
