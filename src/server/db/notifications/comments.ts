import {
  notificationKinds,
  notificationPreferenceTypes,
  type NotificationKind,
  type NotificationPreferenceType
} from "../../../notifications.js";
import { sqlite } from "../client.js";
import { createNotifications, type NotificationTargetInput } from "./write.js";

type CommentEventRow = {
  actorId: number;
  contextId: number;
  ownerId: number | null;
  parentAuthorId: number | null;
  wallOwnerId?: number | null;
};

const commentConfigs = {
  blog: {
    table: "blog_comments",
    column: "blog_id",
    ownerJoin: "JOIN blogs owner ON owner.id = c.blog_id",
    ownerSelect: "owner.author_id AS ownerId",
    contextType: "blog",
    subjectType: "blog_comment",
    ownerKind: notificationKinds.blogComment,
    followedKind: notificationKinds.blogCommentFollowed,
    replyKind: notificationKinds.blogCommentReply
  },
  post: {
    table: "post_comments",
    column: "post_id",
    ownerJoin: "JOIN posts owner ON owner.id = c.post_id",
    ownerSelect: "owner.author_id AS ownerId, owner.wall_user_id AS wallOwnerId",
    contextType: "post",
    subjectType: "post_comment",
    ownerKind: notificationKinds.postComment,
    followedKind: notificationKinds.postCommentFollowed,
    replyKind: notificationKinds.postCommentReply
  },
  skin: {
    table: "skin_comments",
    column: "skin_id",
    ownerJoin: "JOIN skins owner ON owner.id = c.skin_id",
    ownerSelect: "owner.author_id AS ownerId",
    contextType: "skin",
    subjectType: "skin_comment",
    ownerKind: notificationKinds.skinComment,
    followedKind: notificationKinds.skinCommentFollowed,
    replyKind: notificationKinds.skinCommentReply
  }
} as const;

type CommentNotificationTarget = keyof typeof commentConfigs;
type CommentConfig = (typeof commentConfigs)[CommentNotificationTarget];

export function notifyPostComment(commentId: number) {
  return notifyComment("post", commentId);
}

export function notifyBlogComment(commentId: number) {
  return notifyComment("blog", commentId);
}

export function notifySkinComment(commentId: number) {
  return notifyComment("skin", commentId);
}

function notifyComment(target: CommentNotificationTarget, commentId: number) {
  const config = commentConfigs[target];
  const row = commentEventRow(config, commentId);
  if (!row) return false;

  const excluded = new Set<number>([row.actorId]);
  const notifications: NotificationTargetInput[] = [];
  if (row.parentAuthorId && row.parentAuthorId !== row.actorId) {
    notifications.push(commentNotification(row.parentAuthorId, row, config, config.replyKind, commentId, notificationPreferenceTypes.comments));
    excluded.add(row.parentAuthorId);
  }
  for (const ownerId of ownerRecipientIds(row)) {
    if (excluded.has(ownerId)) continue;
    notifications.push(commentNotification(ownerId, row, config, config.ownerKind, commentId, notificationPreferenceTypes.comments));
    excluded.add(ownerId);
  }
  for (const recipientId of commenterIdsBefore(config, row.contextId, commentId)) {
    if (excluded.has(recipientId)) continue;
    notifications.push(commentNotification(recipientId, row, config, config.followedKind, commentId, notificationPreferenceTypes.comments));
    excluded.add(recipientId);
  }
  return createNotifications(notifications);
}

function ownerRecipientIds(row: CommentEventRow) {
  return [row.ownerId, row.wallOwnerId].filter((id): id is number => typeof id === "number");
}

function commentNotification(
  recipientId: number,
  row: CommentEventRow,
  config: CommentConfig,
  kind: NotificationKind,
  commentId: number,
  preferenceType?: NotificationPreferenceType
): NotificationTargetInput {
  return {
    recipientId,
    actorId: row.actorId,
    kind,
    preferenceType,
    subjectType: config.subjectType,
    subjectId: commentId,
    contextType: config.contextType,
    contextId: row.contextId
  };
}

function commentEventRow(config: CommentConfig, commentId: number) {
  return sqlite
    .prepare(
      `SELECT c.author_id AS actorId, c.${config.column} AS contextId, parent.author_id AS parentAuthorId,
        ${config.ownerSelect}
      FROM ${config.table} c
      ${config.ownerJoin}
      LEFT JOIN ${config.table} parent ON parent.id = c.parent_id
      WHERE c.id = ?`
    )
    .get(commentId) as CommentEventRow | undefined;
}

function commenterIdsBefore(config: CommentConfig, contextId: number, beforeCommentId: number) {
  return (
    sqlite
      .prepare(
        `SELECT DISTINCT author_id AS recipientId
        FROM ${config.table}
        WHERE ${config.column} = ? AND id < ?`
      )
      .all(contextId, beforeCommentId) as Array<{ recipientId: number }>
  ).map((row) => row.recipientId);
}
