import type { MessageItem } from "../../../models.js";
import { sqlite } from "../client.js";

const messageColumns = `m.id, m.sender_id AS senderId, sender.username AS senderName, senderProfile.handle AS senderHandle,
  senderProfile.pfp AS senderPfp,
  m.receiver_id AS receiverId, receiver.username AS receiverName, receiverProfile.handle AS receiverHandle, m.subject, m.body_html AS bodyHtml,
  m.read_at AS readAt, m.created_at AS createdAt`;

const messageFrom = `FROM messages m
  JOIN users sender ON sender.id = m.sender_id
  JOIN profiles senderProfile ON senderProfile.user_id = sender.id
  JOIN users receiver ON receiver.id = m.receiver_id
  JOIN profiles receiverProfile ON receiverProfile.user_id = receiver.id`;

export const visibleMessageSql = `((m.sender_id = ? AND m.sender_deleted = 0) OR (m.receiver_id = ? AND m.receiver_deleted = 0))`;

export const visibleMessagesCte = `WITH visible_messages AS (
  SELECT m.*, CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_id
  FROM messages m
  WHERE ${visibleMessageSql}
)`;

export function messageRows(tail: string, ...params: unknown[]) {
  return sqlite.prepare(`SELECT ${messageColumns} ${messageFrom} ${tail}`).all(...params) as MessageItem[];
}

export function visibleMessageParams(userId: number) {
  return [userId, userId] as const;
}

export function visibleConversationParams(userId: number) {
  return [userId, ...visibleMessageParams(userId)] as const;
}
