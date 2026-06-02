import { sqlite } from "./client.js";
import { env } from "../env.js";
import { session, limits } from "../../policy.js";
import { randomToken, sha256 } from "../security/crypto.js";
import { getCurrentUser, getUserByEmail } from "./users.js";
import type { EmailOutboxItem } from "../../models.js";
import { sendSmtpEmail, smtpConfigured } from "../email/smtp.js";
import { siteSettings } from "./siteSettings.js";

const tokenBytes = session.tokenBytes;

export async function requestPasswordReset(email: string) {
  const user = getUserByEmail(email);
  if (!user || user.bannedAt) return;
  const token = issueToken("reset_tokens", user.id, "+2 hours");
  const siteName = siteSettings().identity.name;
  await queueEmail(user.email, `${siteName} password reset`, `Open ${env.baseUrl}/reset/${token} to reset your password for ${siteName}. This link expires in 2 hours.`);
}

export async function requestVerification(userId: number) {
  const user = getCurrentUser(userId);
  if (!user || user.verifiedAt || user.bannedAt) return;
  const token = issueToken("verification_tokens", user.id, "+7 days");
  const siteName = siteSettings().identity.name;
  await queueEmail(user.email, `Verify your ${siteName} account`, `Open ${env.baseUrl}/verify/${token} to verify your account for ${siteName}. This link expires in 7 days.`);
}

export function consumeResetToken(token: string) {
  return consumeToken("reset_tokens", token);
}

export function consumeVerificationToken(token: string) {
  return consumeToken("verification_tokens", token);
}

export async function queueEmail(toEmail: string, subject: string, bodyText: string) {
  const email = toEmail.slice(0, limits.emailMax);
  const subjectText = subject.slice(0, limits.shortText);
  const body = bodyText.slice(0, limits.userText);
  const info = sqlite
    .prepare("INSERT INTO email_outbox (to_email, subject, body_text, delivery_error) VALUES (?, ?, ?, NULL)")
    .run(email, subjectText, body);
  const id = Number(info.lastInsertRowid);
  if (!smtpConfigured()) return { id, sent: false };
  try {
    await sendSmtpEmail(email, subjectText, body);
    sqlite
      .prepare("UPDATE email_outbox SET sent_at = CURRENT_TIMESTAMP, delivery_error = NULL WHERE id = ?")
      .run(id);
    return { id, sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed.";
    sqlite
      .prepare("UPDATE email_outbox SET delivery_error = ? WHERE id = ?")
      .run(message.slice(0, limits.userText), id);
    return { id, sent: false, error: message };
  }
}

export function emailOutbox(limit = limits.listPage) {
  return sqlite
    .prepare(
      `SELECT id, to_email AS toEmail, subject, body_text AS bodyText,
        sent_at AS sentAt, delivery_error AS deliveryError, created_at AS createdAt
      FROM email_outbox ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as EmailOutboxItem[];
}

function consumeToken(table: "reset_tokens" | "verification_tokens", token: string) {
  const hash = sha256(token);
  return sqlite.transaction(() => {
    const row = sqlite
      .prepare(`SELECT user_id AS userId FROM ${table} WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`)
      .get(hash) as { userId: number } | undefined;
    if (!row) return undefined;
    const update = sqlite.prepare(`UPDATE ${table} SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND used_at IS NULL`).run(hash);
    return update.changes > 0 ? row.userId : undefined;
  })();
}

function issueToken(table: "reset_tokens" | "verification_tokens", userId: number, ttl: "+2 hours" | "+7 days") {
  const token = randomToken(tokenBytes);
  sqlite.transaction(() => {
    sqlite.prepare(`DELETE FROM ${table} WHERE user_id = ? AND (used_at IS NOT NULL OR expires_at <= CURRENT_TIMESTAMP)`).run(userId);
    sqlite.prepare(`UPDATE ${table} SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL`).run(userId);
    sqlite.prepare(`INSERT INTO ${table} (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', ?))`).run(sha256(token), userId, ttl);
  })();
  return token;
}
