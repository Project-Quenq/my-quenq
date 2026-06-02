import type { NotificationItem } from "../../../models.js";
import { sqlite } from "../client.js";

const notificationColumns = `n.id, n.recipient_id AS recipientId, n.actor_id AS actorId,
  actor.username AS actorName, actorProfile.handle AS actorHandle,
  n.kind, n.subject_type AS subjectType, n.subject_id AS subjectId,
  n.context_type AS contextType, n.context_id AS contextId,
  CASE n.context_type WHEN 'post' THEN postContext.author_id ELSE NULL END AS contextPostAuthorId,
  CASE n.context_type WHEN 'post' THEN postContext.wall_user_id ELSE NULL END AS contextPostWallUserId,
  CASE n.context_type
    WHEN 'blog' THEN blogContext.title
    WHEN 'skin' THEN skinContext.title
    ELSE NULL
  END AS contextTitle,
  n.read_at AS readAt, n.created_at AS createdAt`;

export const notificationFrom = `FROM notifications n
  JOIN users actor ON actor.id = n.actor_id
  JOIN profiles actorProfile ON actorProfile.user_id = actor.id
  LEFT JOIN posts postContext ON postContext.id = n.context_id AND n.context_type = 'post'
  LEFT JOIN blogs blogContext ON blogContext.id = n.context_id AND n.context_type = 'blog'
  LEFT JOIN skins skinContext ON skinContext.id = n.context_id AND n.context_type = 'skin'`;

const visibleActorSql = `(actor.banned_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks b
    WHERE (b.blocker_id = ? AND b.blocked_id = actor.id)
      OR (b.blocked_id = ? AND b.blocker_id = actor.id)
  )
)`;

const liveContextSql = `(
  (n.context_type = 'blog' AND blogContext.id IS NOT NULL)
  OR (n.context_type = 'post' AND postContext.id IS NOT NULL)
  OR (n.context_type = 'skin' AND skinContext.id IS NOT NULL)
  OR (n.context_type = 'user' AND n.context_id = actor.id)
)`;

export const visibleNotificationSql = `n.recipient_id = ? AND ${visibleActorSql} AND ${liveContextSql}`;

export function notificationRows(tail: string, ...params: unknown[]) {
  return sqlite.prepare(`SELECT ${notificationColumns} ${notificationFrom} ${tail}`).all(...params) as NotificationItem[];
}

export function visibleNotificationParams(userId: number) {
  return [userId, userId, userId] as const;
}
