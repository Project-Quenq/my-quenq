import type { CurrentUser } from "../../../currentUser.js";
import { sqlite } from "../client.js";
import { profileVisibilitySql } from "../profileVisibility.js";
import type { PostItem } from "../../../models.js";

type PostRowsOptions = {
  select?: string;
};

const postColumns = (propVisibilitySql: string, commentVisibilitySql: string, parentCommentVisibilitySql: string) => `po.id, po.body_html AS bodyHtml, po.media_filename AS mediaFilename,
  po.created_at AS createdAt, po.updated_at AS updatedAt,
  author.id AS authorId, author.role AS authorRole, authorProfile.handle AS authorHandle, authorProfile.skin_html AS authorSkinHtml, author.username, authorProfile.pfp,
  u.id AS wallUserId, p.handle AS wallUserHandle, u.username AS wallUsername,
  g.id AS groupId, g.name AS groupName, g.owner_id AS groupOwnerId,
  (
    SELECT COUNT(*)
    FROM post_props props
    JOIN users prop_user ON prop_user.id = props.user_id
    JOIN profiles prop_profile ON prop_profile.user_id = prop_user.id
    WHERE props.post_id = po.id AND ${propVisibilitySql}
  ) AS propCount,
  EXISTS(SELECT 1 FROM post_props own_prop WHERE own_prop.post_id = po.id AND own_prop.user_id = ?) AS proppedByViewer,
  CASE
    WHEN po.group_id IS NULL THEN 1
    WHEN EXISTS (
      SELECT 1 FROM group_members interact_member
      WHERE interact_member.group_id = po.group_id AND interact_member.user_id = ?
    ) THEN 1
    ELSE 0
  END AS viewerCanInteract,
  (
    SELECT COUNT(*)
    FROM post_comments comments
    JOIN users comment_author ON comment_author.id = comments.author_id
    JOIN profiles comment_profile ON comment_profile.user_id = comment_author.id
    WHERE comments.post_id = po.id
      AND ${commentVisibilitySql}
      AND (
        comments.parent_id IS NULL OR EXISTS (
          SELECT 1 FROM post_comments parent_comment
          JOIN users parent_author ON parent_author.id = parent_comment.author_id
          JOIN profiles parent_profile ON parent_profile.user_id = parent_author.id
          WHERE parent_comment.id = comments.parent_id
            AND parent_comment.post_id = comments.post_id
            AND ${parentCommentVisibilitySql}
        )
      )
  ) AS commentCount`;

const postFrom = `FROM posts po
  JOIN users author ON author.id = po.author_id
  JOIN profiles authorProfile ON authorProfile.user_id = author.id
  LEFT JOIN users u ON u.id = po.wall_user_id
  LEFT JOIN profiles p ON p.user_id = u.id
  LEFT JOIN groups g ON g.id = po.group_id
  LEFT JOIN users groupOwner ON groupOwner.id = g.owner_id
  LEFT JOIN profiles groupOwnerProfile ON groupOwnerProfile.user_id = groupOwner.id`;

export function postRows(tail: string, viewer: CurrentUser | null, ...params: unknown[]) {
  return postRowsWithOptions(tail, viewer, {}, ...params);
}

export function postRowsWithOptions(tail: string, viewer: CurrentUser | null, options: PostRowsOptions = {}, ...params: unknown[]) {
  const visibleProps = profileVisibilitySql(viewer, { user: "prop_user", profile: "prop_profile" });
  const visibleComments = profileVisibilitySql(viewer, { user: "comment_author", profile: "comment_profile" });
  const visibleParentComments = profileVisibilitySql(viewer, { user: "parent_author", profile: "parent_profile" });
  const extraColumns = options.select ? `, ${options.select}` : "";
  return sqlite
    .prepare(`SELECT ${postColumns(visibleProps.sql, visibleComments.sql, visibleParentComments.sql)}${extraColumns} ${postFrom} ${tail}`)
    .all(...visibleProps.params, viewerId(viewer), viewerId(viewer), ...visibleComments.params, ...visibleParentComments.params, ...params) as PostItem[];
}

export function viewerId(viewer: CurrentUser | null) {
  return viewer?.id ?? 0;
}

export function authorVisibleSql(viewer: CurrentUser | null): { sql: string; params: unknown[] } {
  return profileVisibilitySql(viewer, { user: "author", profile: "authorProfile" });
}

export function groupOwnerVisibleSql(viewer: CurrentUser | null): { sql: string; params: unknown[] } {
  return profileVisibilitySql(viewer, { user: "groupOwner", profile: "groupOwnerProfile" });
}
