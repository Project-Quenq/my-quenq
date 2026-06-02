import { limits, type ReportSubjectType } from "../../../policy.js";
import { profilePath } from "../../../paths.js";
import { auditActionLabel, isAuditSubjectType, subjectTypeLabel, type AuditSubjectType } from "../../../auditLabels.js";
import { truncateText } from "../../../text.js";
import { recordFromUnknown } from "../../../values.js";
import { sqlite } from "../client.js";
import type { AuditItem } from "../../../models.js";
import { plainTextFromHtml } from "../../security/html.js";
import { getModerationSubject, type ModerationSubject } from "./subjects.js";
import { getReport } from "./reports.js";

type AuditSubjectFields = Pick<
  AuditItem,
  "subjectLabel" | "subjectUrl" | "subjectSummary" | "subjectMissing" | "subjectAuthorId" | "subjectAuthorName" | "subjectAuthorHandle"
>;
type AuditRow = Omit<AuditItem, keyof AuditSubjectFields>;
type MetadataRecord = Record<string, unknown>;

const unresolvableSubjectTypes = new Set<AuditSubjectType>(["app_setting", "rate_limit"]);

export function audit(actorId: number | null, action: string, subjectType: AuditSubjectType, subjectId: number, reasonHtml = "", metadata: Record<string, unknown> = {}) {
  sqlite
    .prepare("INSERT INTO audit_log (actor_id, action, subject_type, subject_id, reason_html, metadata_json) VALUES (?, ?, ?, ?, ?, ?)")
    .run(actorId, action, subjectType, subjectId, reasonHtml, JSON.stringify(metadata));
}

export function auditSubjectMetadata(subject: ModerationSubject): Record<string, unknown> {
  return {
    subjectLabel: auditModerationSubjectLabel(subject),
    subjectSummary: subject.summary,
    subjectAuthorId: subject.authorId,
    subjectAuthorName: subject.authorName,
    subjectAuthorHandle: subject.authorHandle
  };
}

export function moderationSubjectAuditMetadata(subjectType: ReportSubjectType, subjectId: number): Record<string, unknown> {
  const subject = getModerationSubject(subjectType, subjectId);
  return subject ? auditSubjectMetadata(subject) : {};
}

export function auditLog(limit = limits.listPage) {
  const rows = sqlite
    .prepare(
      `SELECT a.id, a.actor_id AS actorId, u.username AS actorName, p.handle AS actorHandle, a.action,
        a.subject_type AS subjectType, a.subject_id AS subjectId, a.reason_html AS reasonHtml,
        a.metadata_json AS metadataJson, a.created_at AS createdAt
      FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
      LEFT JOIN profiles p ON p.user_id = u.id
      ORDER BY a.created_at DESC LIMIT ?`
    )
    .all(limit) as AuditRow[];
  return rows.map(hydrateAuditRow);
}

function hydrateAuditRow(row: AuditRow): AuditItem {
  return {
    ...row,
    ...(specialAuditSubject(row) ?? moderationAuditSubject(row) ?? metadataAuditSubject(row) ?? defaultAuditSubject(row))
  } satisfies AuditItem;
}

function specialAuditSubject(row: AuditRow): AuditSubjectFields | undefined {
  if (row.subjectType === "app_setting") return subjectFields(appSettingLabel(row.action), "/admin/branding");
  if (row.subjectType === "rate_limit") return subjectFields("Rate limits", "/admin/rate-limits");
  if (row.subjectType === "automod_rule") return automodRuleSubject(row.subjectId);
  if (row.subjectType === "email") return emailSubject(row.subjectId);
  if (row.subjectType === "favorite") return profileSubject(row.subjectId, "Favorite");
  if (row.subjectType === "report") return reportSubject(row.subjectId);
  return undefined;
}

function moderationAuditSubject(row: AuditRow): AuditSubjectFields | undefined {
  const subject = getModerationSubject(row.subjectType, row.subjectId);
  if (!subject) return undefined;
  return subjectFields(
    auditModerationSubjectLabel(subject),
    subject.url,
    subject.summary,
    false,
    subject.authorId,
    subject.authorName,
    subject.authorHandle
  );
}

function automodRuleSubject(ruleId: number): AuditSubjectFields | undefined {
  const row = sqlite.prepare("SELECT name FROM automod_rules WHERE id = ?").get(ruleId) as { name: string } | undefined;
  if (!row) return undefined;
  return subjectFields(`Automod rule: ${truncateLabel(row.name)}`, `/admin/automod?open=${ruleId}#automod-rule-${ruleId}`);
}

function emailSubject(emailId: number): AuditSubjectFields | undefined {
  if (emailId <= 0) return subjectFields("Email outbox", "/admin/email");
  const row = sqlite
    .prepare("SELECT to_email AS toEmail, subject FROM email_outbox WHERE id = ?")
    .get(emailId) as { subject: string; toEmail: string } | undefined;
  if (!row) return undefined;
  return subjectFields(`Email: ${truncateLabel(row.subject)}`, "/admin/email", `To ${row.toEmail}`);
}

function profileSubject(userId: number, label: string): AuditSubjectFields | undefined {
  const row = sqlite
    .prepare("SELECT u.username, p.handle FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?")
    .get(userId) as { handle: string; username: string } | undefined;
  if (!row) return undefined;
  return subjectFields(`${label}: ${row.username}`, profilePath(row), "", false, userId, row.username, row.handle);
}

function reportSubject(reportId: number): AuditSubjectFields | undefined {
  const report = getReport(reportId);
  if (!report) return undefined;
  const reason = plainTextFromHtml(report.reasonHtml);
  const summary = [report.subjectSummary, reason ? `Reason: ${reason}` : ""].filter(Boolean).join(" ");
  return subjectFields(
    `Report: ${truncateLabel(report.subjectLabel)}`,
    "/admin/reports",
    summary,
    false,
    report.subjectAuthorId,
    report.subjectAuthorName,
    report.subjectAuthorHandle
  );
}

function metadataAuditSubject(row: AuditRow): AuditSubjectFields | undefined {
  const metadata = metadataRecord(row.metadataJson);
  const label = metadataString(metadata.subjectLabel);
  const summary = metadataString(metadata.subjectSummary) ?? "";
  if (!label && !summary) return undefined;
  return subjectFields(
    label ?? defaultSubjectLabel(row),
    null,
    summary,
    true,
    metadataNumber(metadata.subjectAuthorId),
    metadataString(metadata.subjectAuthorName) ?? null,
    metadataString(metadata.subjectAuthorHandle) ?? null
  );
}

function defaultAuditSubject(row: AuditRow): AuditSubjectFields {
  return subjectFields(defaultSubjectLabel(row), null, "", isResolvableSubjectType(row.subjectType));
}

function isResolvableSubjectType(subjectType: string) {
  return isAuditSubjectType(subjectType) && !unresolvableSubjectTypes.has(subjectType);
}

function auditModerationSubjectLabel(subject: ModerationSubject) {
  if (subject.type === "user") return subject.authorName ?? `Profile #${subject.id}`;
  const titled = titledSubjectLabel(subject);
  const summary = titled || subject.summary;
  const text = summary ? truncateLabel(summary) : subject.label;
  return `${subjectTypeLabel(subject.type)}: ${text}`;
}

function titledSubjectLabel(subject: ModerationSubject) {
  const prefix = `${subjectTypeLabel(subject.type)}: `;
  if (!subject.label.startsWith(prefix)) return "";
  return subject.label.slice(prefix.length).replace(/\s+#\d+$/, "");
}

function appSettingLabel(action: string) {
  if (action === "reset_color_theme" || action === "update_color_theme") return "Color theme";
  if (action === "update_site_identity") return "Site identity";
  if (action === "update_site_home") return "Home page settings";
  if (action === "update_site_contact") return "Contact settings";
  return `Site setting: ${auditActionLabel(action)}`;
}

function defaultSubjectLabel(row: AuditRow) {
  const label = subjectTypeLabel(row.subjectType);
  return row.subjectId > 0 ? `${label} #${row.subjectId}` : label;
}

function subjectFields(
  subjectLabel: string,
  subjectUrl: string | null,
  subjectSummary = "",
  subjectMissing = false,
  subjectAuthorId: number | null = null,
  subjectAuthorName: string | null = null,
  subjectAuthorHandle: string | null = null
): AuditSubjectFields {
  return {
    subjectLabel,
    subjectUrl,
    subjectSummary,
    subjectMissing,
    subjectAuthorId,
    subjectAuthorName,
    subjectAuthorHandle
  };
}

function metadataRecord(json: string): MetadataRecord {
  try {
    return recordFromUnknown(JSON.parse(json));
  } catch {
    return {};
  }
}

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function metadataNumber(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function truncateLabel(value: string) {
  return truncateText(value, 72);
}
