import { sqlite } from "../client.js";
import { isBlockedBetween } from "../relationships.js";

export function markConversationRead(otherUserId: number, userId: number) {
  sqlite
    .prepare(
      `UPDATE messages
      SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE sender_id = ? AND receiver_id = ? AND receiver_deleted = 0`
    )
    .run(otherUserId, userId);
}

export function sendMessage(senderId: number, receiverId: number, subject: string, bodyHtml: string) {
  if (senderId === receiverId || isBlockedBetween(senderId, receiverId)) return false;
  const info = sqlite
    .prepare("INSERT INTO messages (sender_id, receiver_id, subject, body_html) VALUES (?, ?, ?, ?)")
    .run(senderId, receiverId, subject, bodyHtml);
  return Number(info.lastInsertRowid);
}

export function deleteMessageFor(userId: number, messageId: number) {
  return sqlite.transaction(() => {
    const receiver = sqlite.prepare("UPDATE messages SET receiver_deleted = 1 WHERE id = ? AND receiver_id = ?").run(messageId, userId).changes;
    const sender = sqlite.prepare("UPDATE messages SET sender_deleted = 1 WHERE id = ? AND sender_id = ?").run(messageId, userId).changes;
    sqlite.prepare("DELETE FROM messages WHERE id = ? AND receiver_deleted = 1 AND sender_deleted = 1").run(messageId);
    return receiver + sender > 0;
  })();
}

export function deleteMessage(messageId: number) {
  return sqlite.prepare("DELETE FROM messages WHERE id = ?").run(messageId).changes > 0;
}
