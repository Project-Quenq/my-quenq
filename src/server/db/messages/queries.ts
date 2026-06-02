import {
  decodeKeysetCursor,
  keysetBeforeCondition,
  normalizePageLimit,
  pageFromRows,
  type PageOptions
} from "../../pagination.js";
import { limits } from "../../../policy.js";
import type { MessageConversation } from "../../../models.js";
import { sqlite } from "../client.js";
import { messageRows, visibleConversationParams, visibleMessageParams, visibleMessagesCte, visibleMessageSql } from "./sql.js";

type ConversationParticipantRow = {
  handle: string;
  id: number;
  pfp: string;
  username: string;
};

export function conversationsForUser(userId: number, options: PageOptions = {}) {
  const limit = normalizePageLimit(options.limit, limits.listPage, limits.listPage);
  const before = keysetBeforeCondition(decodeKeysetCursor(options.before), "ranked.created_at", "ranked.id");
  const rows = sqlite
    .prepare(
      `${visibleMessagesCte},
      ranked AS (
        SELECT visible_messages.*,
          ROW_NUMBER() OVER (PARTITION BY other_id ORDER BY created_at DESC, id DESC) AS rn,
          SUM(CASE WHEN receiver_id = ? AND read_at IS NULL AND receiver_deleted = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY other_id) AS unreadCount
        FROM visible_messages
      )
      SELECT ranked.id, ranked.other_id AS otherUserId, other.username AS otherName, otherProfile.handle AS otherHandle,
        otherProfile.pfp AS otherPfp, ranked.sender_id AS latestSenderId,
        ranked.subject AS latestSubject, ranked.unreadCount, ranked.created_at AS createdAt
      FROM ranked
      JOIN users other ON other.id = ranked.other_id
      JOIN profiles otherProfile ON otherProfile.user_id = other.id
      WHERE ranked.rn = 1
      ${before.sql}
      ORDER BY ranked.created_at DESC, ranked.id DESC LIMIT ?`
    )
    .all(...visibleConversationParams(userId), userId, ...before.params, limit + 1) as MessageConversation[];
  return pageFromRows(rows, limit);
}

export function messagesForConversation(userId: number, otherUserId: number, options: PageOptions = {}) {
  const limit = normalizePageLimit(options.limit, limits.listPage, limits.listPage);
  const before = keysetBeforeCondition(decodeKeysetCursor(options.before), "m.created_at", "m.id");
  return pageFromRows(
    messageRows(
      `WHERE (
        (m.sender_id = ? AND m.receiver_id = ? AND m.sender_deleted = 0) OR
        (m.sender_id = ? AND m.receiver_id = ? AND m.receiver_deleted = 0)
      )
      ${before.sql}
      ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
      userId,
      otherUserId,
      otherUserId,
      userId,
      ...before.params,
      limit + 1
    ),
    limit
  );
}

export function conversationParticipantForHandle(userId: number, handle: string) {
  return sqlite
    .prepare(
      `${visibleMessagesCte}
      SELECT other.id, other.username, otherProfile.handle, otherProfile.pfp
      FROM visible_messages m
      JOIN users other ON other.id = m.other_id
      JOIN profiles otherProfile ON otherProfile.user_id = other.id
      WHERE otherProfile.handle = ?
      ORDER BY m.created_at DESC, m.id DESC LIMIT 1`
    )
    .get(...visibleConversationParams(userId), handle) as ConversationParticipantRow | undefined;
}

export function messagesForUser(userId: number, limit = limits.exportRows) {
  return messageRows(
    `WHERE ${visibleMessageSql}
    ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
    ...visibleMessageParams(userId),
    limit
  );
}

export function unreadMessageCount(userId: number) {
  return (
    sqlite
      .prepare(
        `SELECT COUNT(*) AS count
        FROM messages
        WHERE receiver_id = ? AND receiver_deleted = 0 AND read_at IS NULL`
      )
      .get(userId) as { count: number }
  ).count;
}

export function canViewMessage(userId: number, messageId: number) {
  return Boolean(
    sqlite
      .prepare(
        `SELECT 1 FROM messages m
        WHERE m.id = ? AND ${visibleMessageSql}`
      )
      .get(messageId, ...visibleMessageParams(userId))
  );
}
