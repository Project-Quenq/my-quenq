import {
  notificationKinds,
  notificationPreferenceTypes,
  type NotificationKind,
  type NotificationPreferenceType,
  type NotificationSubjectType
} from "../../../notifications.js";
import type { CurrentUser } from "../../../currentUser.js";
import { sqlite } from "../client.js";
import { notificationFrom, visibleNotificationParams, visibleNotificationSql } from "./sql.js";
import { createNotification } from "./write.js";

type PropOwnerRow = {
  ownerId: number | null;
};

export function notifyPostProp(postId: number, actorId: number) {
  return notifyOwnerProp("posts", postId, actorId, notificationKinds.postProp, "post", notificationPreferenceTypes.props);
}

export function notifyBlogProp(blogId: number, actorId: number) {
  return notifyOwnerProp("blogs", blogId, actorId, notificationKinds.blogProp, "blog", notificationPreferenceTypes.props);
}

export function notifyFavorite(actorId: number, recipientId: number) {
  return notifyUserEvent(actorId, recipientId, notificationKinds.favorite, notificationPreferenceTypes.favorites);
}

export function notifyFriendAccepted(actorId: number, recipientId: number) {
  return notifyUserEvent(actorId, recipientId, notificationKinds.friendAccepted, notificationPreferenceTypes.friendAccepts);
}

export function markVisibleNotificationsRead(viewer: CurrentUser) {
  sqlite
    .prepare(
      `UPDATE notifications
      SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id IN (
        SELECT n.id ${notificationFrom}
        WHERE ${visibleNotificationSql} AND n.read_at IS NULL
      )`
    )
    .run(...visibleNotificationParams(viewer.id));
}

function notifyOwnerProp(
  table: "blogs" | "posts",
  subjectId: number,
  actorId: number,
  kind: NotificationKind,
  subjectType: Extract<NotificationSubjectType, "blog" | "post">,
  preferenceType: NotificationPreferenceType
) {
  const row = sqlite.prepare(`SELECT author_id AS ownerId FROM ${table} WHERE id = ?`).get(subjectId) as PropOwnerRow | undefined;
  return createNotification({
    recipientId: row?.ownerId,
    actorId,
    kind,
    preferenceType,
    subjectType,
    subjectId,
    contextType: subjectType,
    contextId: subjectId
  });
}

function notifyUserEvent(actorId: number, recipientId: number, kind: NotificationKind, preferenceType: NotificationPreferenceType) {
  return createNotification({
    recipientId,
    actorId,
    kind,
    preferenceType,
    subjectType: "user",
    subjectId: actorId,
    contextType: "user",
    contextId: actorId
  });
}
