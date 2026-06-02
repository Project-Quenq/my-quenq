import type { CurrentUser } from "../../../currentUser.js";
import type { PostCommentBumpActor, PostItem } from "../../../models.js";
import { friendshipStatus } from "../../../policy.js";
import {
  decodeKeysetCursor,
  keysetBeforeCondition,
  normalizePageLimit,
  pageFromRows,
  type PageOptions
} from "../../pagination.js";
import { profileVisibilitySql } from "../profileVisibility.js";
import { postRowsWithOptions } from "./sql.js";

type SqlFragment = {
  sql: string;
  params: unknown[];
};

type ActivityPostRow = PostItem & {
  activityAt: string | null;
  activitySortId: number;
  commentBumpAt: string | null;
  commentBumpActorCount: number | null;
  commentBumpActor1Id: number | null;
  commentBumpActor1Handle: string | null;
  commentBumpActor1Name: string | null;
  commentBumpActor2Id: number | null;
  commentBumpActor2Handle: string | null;
  commentBumpActor2Name: string | null;
  commentBumpActor3Id: number | null;
  commentBumpActor3Handle: string | null;
  commentBumpActor3Name: string | null;
};

const commentActivitySortOffset = 1_000_000_000_000;

export const commentActivityTimestampSql = "COALESCE(commentActivity.commentBumpAt, po.created_at)";

export function pagedCommentActivityPostRows(
  viewer: CurrentUser | null,
  options: PageOptions,
  fallbackLimit: number,
  maxLimit: number,
  tailSql: string,
  activityTimestampSql: string,
  ...params: unknown[]
) {
  const limit = normalizePageLimit(options.limit, fallbackLimit, maxLimit);
  const activitySortSql = `CASE WHEN commentActivity.commentBumpId IS NOT NULL THEN commentActivity.commentBumpId + ${commentActivitySortOffset} ELSE po.id END`;
  const before = keysetBeforeCondition(decodeKeysetCursor(options.before), activityTimestampSql, activitySortSql);
  const rows = postRowsWithOptions(
    `${tailSql}
      ${before.sql}
      ORDER BY ${activityTimestampSql} DESC, ${activitySortSql} DESC LIMIT ?`,
    viewer,
    {
      select: `${activityTimestampSql} AS activityAt,
        ${activitySortSql} AS activitySortId,
        commentActivity.commentBumpAt AS commentBumpAt,
        COALESCE(commentActivity.commentBumpActorCount, 0) AS commentBumpActorCount,
        commentActivity.commentBumpActor1Id AS commentBumpActor1Id,
        commentActivity.commentBumpActor1Handle AS commentBumpActor1Handle,
        commentActivity.commentBumpActor1Name AS commentBumpActor1Name,
        commentActivity.commentBumpActor2Id AS commentBumpActor2Id,
        commentActivity.commentBumpActor2Handle AS commentBumpActor2Handle,
        commentActivity.commentBumpActor2Name AS commentBumpActor2Name,
        commentActivity.commentBumpActor3Id AS commentBumpActor3Id,
        commentActivity.commentBumpActor3Handle AS commentBumpActor3Handle,
        commentActivity.commentBumpActor3Name AS commentBumpActor3Name`
    },
    ...params,
    ...before.params,
    limit + 1
  ) as ActivityPostRow[];

  const page = pageFromRows(rows, limit, (row) => ({ createdAt: row.activityAt ?? row.createdAt, id: row.activitySortId }));
  return { items: page.items.map(postFromActivityRow), nextCursor: page.nextCursor };
}

function postFromActivityRow(row: ActivityPostRow): PostItem {
  const {
    activityAt,
    activitySortId,
    commentBumpAt,
    commentBumpActorCount,
    commentBumpActor1Id,
    commentBumpActor1Handle,
    commentBumpActor1Name,
    commentBumpActor2Id,
    commentBumpActor2Handle,
    commentBumpActor2Name,
    commentBumpActor3Id,
    commentBumpActor3Handle,
    commentBumpActor3Name,
    ...post
  } = row;
  const actors = [
    commentBumpActor(commentBumpActor1Id, commentBumpActor1Handle, commentBumpActor1Name),
    commentBumpActor(commentBumpActor2Id, commentBumpActor2Handle, commentBumpActor2Name),
    commentBumpActor(commentBumpActor3Id, commentBumpActor3Handle, commentBumpActor3Name)
  ].filter((actor): actor is PostCommentBumpActor => actor !== null);

  return {
    ...post,
    commentBump: commentBumpAt && actors.length ? {
      commentedAt: commentBumpAt,
      commenterCount: Math.max(commentBumpActorCount ?? 0, actors.length),
      actors
    } : null
  };
}

function commentBumpActor(id: number | null, handle: string | null, name: string | null): PostCommentBumpActor | null {
  return typeof id === "number" && handle && name ? { id, handle, name } : null;
}

export function wallCommentSourceSql(wallUserId: number): SqlFragment {
  return { sql: "activityPost.wall_user_id = ?", params: [wallUserId] };
}

export function profileCommentSourceSql(profileId: number): SqlFragment {
  return {
    sql: "(activityPost.wall_user_id = ? OR (activityPost.group_id IS NOT NULL AND activityPost.author_id = ?))",
    params: [profileId, profileId]
  };
}

export function groupCommentSourceSql(groupId: number): SqlFragment {
  return { sql: "activityPost.group_id = ?", params: [groupId] };
}

export function feedCommentSourceSql(userId: number): SqlFragment {
  return {
    sql: `activityComment.author_id = ?
      OR EXISTS (
        SELECT 1 FROM friendships activityFriendship
        WHERE activityFriendship.status = ?
          AND (
            (activityFriendship.sender_id = ? AND activityFriendship.receiver_id = activityComment.author_id)
            OR (activityFriendship.receiver_id = ? AND activityFriendship.sender_id = activityComment.author_id)
          )
      )
      OR (
        activityPost.group_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM group_members activityViewerGroupMember
          WHERE activityViewerGroupMember.group_id = activityPost.group_id AND activityViewerGroupMember.user_id = ?
        )
        AND EXISTS (
          SELECT 1 FROM group_members activityCommentGroupMember
          WHERE activityCommentGroupMember.group_id = activityPost.group_id AND activityCommentGroupMember.user_id = activityComment.author_id
        )
      )`,
    params: [userId, friendshipStatus.accepted, userId, userId, userId]
  };
}

export function postCommentActivityJoin(viewer: CurrentUser | null, source: SqlFragment): SqlFragment {
  const visible = profileVisibilitySql(viewer, { user: "activityAuthor", profile: "activityProfile" });
  const parentVisible = profileVisibilitySql(viewer, { user: "activityParentAuthor", profile: "activityParentProfile" });
  return {
    sql: `LEFT JOIN (
      SELECT
        activityAuthors.postId,
        MAX(CASE WHEN activityAuthors.authorRank = 1 THEN activityAuthors.createdAt END) AS commentBumpAt,
        MAX(CASE WHEN activityAuthors.authorRank = 1 THEN activityAuthors.commentId END) AS commentBumpId,
        COUNT(*) AS commentBumpActorCount,
        MAX(CASE WHEN activityAuthors.authorRank = 1 THEN activityAuthors.authorId END) AS commentBumpActor1Id,
        MAX(CASE WHEN activityAuthors.authorRank = 1 THEN activityAuthors.authorHandle END) AS commentBumpActor1Handle,
        MAX(CASE WHEN activityAuthors.authorRank = 1 THEN activityAuthors.username END) AS commentBumpActor1Name,
        MAX(CASE WHEN activityAuthors.authorRank = 2 THEN activityAuthors.authorId END) AS commentBumpActor2Id,
        MAX(CASE WHEN activityAuthors.authorRank = 2 THEN activityAuthors.authorHandle END) AS commentBumpActor2Handle,
        MAX(CASE WHEN activityAuthors.authorRank = 2 THEN activityAuthors.username END) AS commentBumpActor2Name,
        MAX(CASE WHEN activityAuthors.authorRank = 3 THEN activityAuthors.authorId END) AS commentBumpActor3Id,
        MAX(CASE WHEN activityAuthors.authorRank = 3 THEN activityAuthors.authorHandle END) AS commentBumpActor3Handle,
        MAX(CASE WHEN activityAuthors.authorRank = 3 THEN activityAuthors.username END) AS commentBumpActor3Name
      FROM (
        SELECT
          activityLatestAuthorComment.*,
          ROW_NUMBER() OVER (
            PARTITION BY activityLatestAuthorComment.postId
            ORDER BY activityLatestAuthorComment.createdAt DESC, activityLatestAuthorComment.commentId DESC
          ) AS authorRank
        FROM (
          SELECT
            activityVisibleComment.postId,
            activityVisibleComment.commentId,
            activityVisibleComment.createdAt,
            activityVisibleComment.authorId,
            activityVisibleComment.username,
            activityVisibleComment.authorHandle
          FROM (
            SELECT
              activityComment.post_id AS postId,
              activityComment.id AS commentId,
              activityComment.created_at AS createdAt,
              activityComment.author_id AS authorId,
              activityAuthor.username,
              activityProfile.handle AS authorHandle,
              ROW_NUMBER() OVER (
                PARTITION BY activityComment.post_id, activityComment.author_id
                ORDER BY activityComment.created_at DESC, activityComment.id DESC
              ) AS authorCommentRank
            FROM post_comments activityComment
            JOIN posts activityPost ON activityPost.id = activityComment.post_id
            JOIN users activityAuthor ON activityAuthor.id = activityComment.author_id
            JOIN profiles activityProfile ON activityProfile.user_id = activityAuthor.id
            WHERE ${visible.sql}
              AND (
                activityComment.parent_id IS NULL OR EXISTS (
                  SELECT 1 FROM post_comments activityParentComment
                  JOIN users activityParentAuthor ON activityParentAuthor.id = activityParentComment.author_id
                  JOIN profiles activityParentProfile ON activityParentProfile.user_id = activityParentAuthor.id
                  WHERE activityParentComment.id = activityComment.parent_id
                    AND activityParentComment.post_id = activityComment.post_id
                    AND ${parentVisible.sql}
                )
              )
              AND (${source.sql})
          ) activityVisibleComment
          WHERE activityVisibleComment.authorCommentRank = 1
        ) activityLatestAuthorComment
      ) activityAuthors
      GROUP BY activityAuthors.postId
    ) commentActivity ON commentActivity.postId = po.id`,
    params: [...visible.params, ...parentVisible.params, ...source.params]
  };
}
