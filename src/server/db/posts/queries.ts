import type { PageOptions } from "../../pagination.js";
import { friendshipStatus, limits } from "../../../policy.js";
import type { CurrentUser } from "../../../currentUser.js";
import { authorVisibleSql, groupOwnerVisibleSql, postRows, viewerId } from "./sql.js";
import { profileVisibilitySql } from "../profileVisibility.js";
import { groupPostAccessSql } from "../groups.js";
import { containsLikePattern, likeEscapeClause } from "../like.js";
import {
  commentActivityTimestampSql,
  feedCommentSourceSql,
  groupCommentSourceSql,
  pagedCommentActivityPostRows,
  postCommentActivityJoin,
  profileCommentSourceSql
} from "./commentActivity.js";

export function getPost(id: number, viewer: CurrentUser | null = null) {
  return postRows("WHERE po.id = ? LIMIT 1", viewer, id)[0];
}

export function getVisiblePost(id: number, viewer: CurrentUser | null) {
  const visiblePost = visiblePostAccessSql(viewer);
  const author = authorVisibleSql(viewer);
  return postRows(
    `WHERE po.id = ? AND ${visiblePost.sql} AND ${author.sql} LIMIT 1`,
    viewer,
    id,
    ...visiblePost.params,
    ...author.params
  )[0];
}

export function postsForProfilePage(profileId: number, viewer: CurrentUser | null, options: PageOptions = {}) {
  const visiblePost = visiblePostAccessSql(viewer);
  const author = authorVisibleSql(viewer);
  const commentActivity = postCommentActivityJoin(viewer, profileCommentSourceSql(profileId));
  return pagedCommentActivityPostRows(
    viewer,
    options,
    limits.listPage,
    limits.listPage,
    `${commentActivity.sql}
    WHERE ${visiblePost.sql}
      AND ${author.sql}
      AND (po.wall_user_id = ? OR (po.group_id IS NOT NULL AND po.author_id = ?))`,
    commentActivityTimestampSql,
    ...commentActivity.params,
    ...visiblePost.params,
    ...author.params,
    profileId,
    profileId
  );
}

export function postsForGroupPage(groupId: number, viewer: CurrentUser | null, options: PageOptions = {}) {
  const author = authorVisibleSql(viewer);
  const groupOwner = groupOwnerVisibleSql(viewer);
  const groupAccess = groupPostAccessSql(viewer);
  const commentActivity = postCommentActivityJoin(viewer, groupCommentSourceSql(groupId));
  return pagedCommentActivityPostRows(
    viewer,
    options,
    limits.listPage,
    limits.listPage,
    `${commentActivity.sql}
    WHERE po.group_id = ? AND ${groupAccess.sql} AND ${groupOwner.sql} AND ${author.sql}`,
    commentActivityTimestampSql,
    ...commentActivity.params,
    groupId,
    ...groupAccess.params,
    ...groupOwner.params,
    ...author.params
  );
}

export function searchPosts(query: string, viewer: CurrentUser | null, limit = limits.listPage) {
  if (!viewer) return [];
  const pattern = containsLikePattern(query);
  const visiblePost = visiblePostAccessSql(viewer);
  const author = authorVisibleSql(viewer);
  return postRows(
    `WHERE po.body_html LIKE ? ${likeEscapeClause} AND ${visiblePost.sql} AND ${author.sql}
    ORDER BY po.created_at DESC, po.id DESC LIMIT ?`,
    viewer,
    pattern,
    ...visiblePost.params,
    ...author.params,
    limit
  );
}

export function feedPageForUser(viewer: CurrentUser, options: PageOptions = {}) {
  const userId = viewer.id;
  const visiblePost = visiblePostAccessSql(viewer);
  const author = authorVisibleSql(viewer);
  const commentActivity = postCommentActivityJoin(viewer, feedCommentSourceSql(userId));
  const feedSource = feedPostSourceSql(userId);
  return pagedCommentActivityPostRows(
    viewer,
    options,
    limits.feedPosts,
    limits.listPage,
    `${commentActivity.sql}
    WHERE ${visiblePost.sql}
      AND ${author.sql}
      AND ((${feedSource.sql}) OR commentActivity.postId IS NOT NULL)`,
    commentActivityTimestampSql,
    ...commentActivity.params,
    ...visiblePost.params,
    ...author.params,
    ...feedSource.params
  );
}

function visiblePostAccessSql(viewer: CurrentUser | null) {
  const wallOwner = profileVisibilitySql(viewer);
  const groupAccess = groupPostAccessSql(viewer);
  const groupOwner = groupOwnerVisibleSql(viewer);
  const knownAuthor = knownAuthorPostSql(viewer);
  return {
    sql: `(
      (po.wall_user_id IS NOT NULL AND ${wallOwner.sql})
      OR (
        po.group_id IS NOT NULL
        AND (${groupAccess.sql} OR ${knownAuthor.sql})
        AND ${groupOwner.sql}
      )
    )`,
    params: [...wallOwner.params, ...groupAccess.params, ...knownAuthor.params, ...groupOwner.params]
  };
}

function feedPostSourceSql(userId: number) {
  const knownAuthor = knownAuthorPostSql(userId);
  return {
    sql: `(
      po.wall_user_id IS NOT NULL
      AND (
        po.wall_user_id = ?
        OR EXISTS (
          SELECT 1 FROM friendships feedWallFriendship
          WHERE feedWallFriendship.status = ?
            AND (
              (feedWallFriendship.sender_id = ? AND feedWallFriendship.receiver_id = po.wall_user_id)
              OR (feedWallFriendship.receiver_id = ? AND feedWallFriendship.sender_id = po.wall_user_id)
            )
        )
        OR ${knownAuthor.sql}
      )
    ) OR (
      po.group_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM group_members feedGroupMember
          WHERE feedGroupMember.group_id = po.group_id AND feedGroupMember.user_id = ?
        )
        OR ${knownAuthor.sql}
      )
    )`,
    params: [userId, friendshipStatus.accepted, userId, userId, ...knownAuthor.params, userId, ...knownAuthor.params]
  };
}

function knownAuthorPostSql(viewerOrId: CurrentUser | number | null) {
  const userId = typeof viewerOrId === "number" ? viewerOrId : viewerOrId?.id;
  if (!userId) return { sql: "0 = 1", params: [] };
  return {
    sql: `(po.author_id = ? OR EXISTS (
      SELECT 1 FROM friendships knownAuthorFriendship
      WHERE knownAuthorFriendship.status = ?
        AND (
          (knownAuthorFriendship.sender_id = ? AND knownAuthorFriendship.receiver_id = po.author_id)
          OR (knownAuthorFriendship.receiver_id = ? AND knownAuthorFriendship.sender_id = po.author_id)
        )
    ))`,
    params: [userId, friendshipStatus.accepted, userId, userId]
  };
}

export function postsAuthoredByUser(userId: number, limit = limits.exportRows) {
  const viewer = exportViewer(userId);
  return postRows("WHERE po.author_id = ? ORDER BY po.created_at DESC, po.id DESC LIMIT ?", viewer, userId, limit);
}

export function postsOnWallForUser(userId: number, limit = limits.exportRows) {
  const viewer = exportViewer(userId);
  return postRows("WHERE po.wall_user_id = ? ORDER BY po.created_at DESC, po.id DESC LIMIT ?", viewer, userId, limit);
}

export function proppedPostsForUser(userId: number, limit = limits.exportRows) {
  const viewer = exportViewer(userId);
  return postRows(
    `WHERE po.id IN (SELECT p.post_id FROM post_props p WHERE p.user_id = ?)
    ORDER BY po.created_at DESC, po.id DESC LIMIT ?`,
    viewer,
    userId,
    limit
  );
}

export function proppedPostsForViewer(viewer: CurrentUser, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  const author = authorVisibleSql(viewer);
  const groupOwner = groupOwnerVisibleSql(viewer);
  const groupAccess = groupPostAccessSql(viewer);
  return postRows(
    `JOIN post_props viewer_prop ON viewer_prop.post_id = po.id AND viewer_prop.user_id = ?
    WHERE (
      (po.wall_user_id IS NOT NULL AND ${visible.sql})
      OR (
        po.group_id IS NOT NULL
        AND ${groupAccess.sql}
        AND ${groupOwner.sql}
      )
    ) AND ${author.sql}
    ORDER BY viewer_prop.created_at DESC, po.id DESC LIMIT ?`,
    viewer,
    viewer.id,
    ...visible.params,
    ...groupAccess.params,
    ...groupOwner.params,
    ...author.params,
    limit
  );
}

function exportViewer(userId: number): CurrentUser {
  return {
    id: userId,
    username: "",
    email: "",
    role: "user",
    timeZone: "UTC",
    verifiedAt: null,
    bannedAt: null
  };
}
