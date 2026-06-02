import { limits, type ReportSubjectType } from "../../../policy.js";
import { sqlite } from "../client.js";
import type { ReportItem } from "../../../models.js";
import { getModerationSubject } from "./subjects.js";

type ReportRow = Omit<ReportItem, "subjectLabel" | "subjectUrl" | "subjectSummary" | "subjectMissing" | "subjectCanDelete">;

const reportSelect = `SELECT r.id, r.reporter_id AS reporterId, reporter.username AS reporterName, reporterProfile.handle AS reporterHandle,
  r.subject_author_id AS subjectAuthorId, author.username AS subjectAuthorName, authorProfile.handle AS subjectAuthorHandle,
  r.subject_type AS subjectType, r.subject_id AS subjectId, r.reason_html AS reasonHtml,
  r.created_at AS createdAt, r.resolved_at AS resolvedAt, resolver.username AS resolvedByName
  FROM reports r
  LEFT JOIN users reporter ON reporter.id = r.reporter_id
  LEFT JOIN profiles reporterProfile ON reporterProfile.user_id = reporter.id
  LEFT JOIN users author ON author.id = r.subject_author_id
  LEFT JOIN profiles authorProfile ON authorProfile.user_id = author.id
  LEFT JOIN users resolver ON resolver.id = r.resolved_by`;

export function createReport(reporterId: number | null, subjectType: ReportSubjectType, subjectId: number, reasonHtml: string, subjectAuthorId?: number | null) {
  sqlite
    .prepare("INSERT INTO reports (reporter_id, subject_author_id, subject_type, subject_id, reason_html) VALUES (?, ?, ?, ?, ?)")
    .run(reporterId, subjectAuthorId ?? null, subjectType, subjectId, reasonHtml);
}

export function listReports(includeResolved = false, limit = limits.listPage) {
  const filter = includeResolved ? "" : "WHERE r.resolved_at IS NULL";
  return hydrateReports(reportRows(`${filter} ORDER BY r.created_at DESC LIMIT ?`, limit));
}

export function listResolvedReports(limit = limits.listPage) {
  return hydrateReports(reportRows("WHERE r.resolved_at IS NOT NULL ORDER BY r.resolved_at DESC, r.created_at DESC LIMIT ?", limit));
}

export function getReport(reportId: number) {
  return hydrateReports(reportRows("WHERE r.id = ? LIMIT 1", reportId))[0];
}

export function reportsFiledByUser(userId: number, limit = limits.exportRows) {
  return hydrateReports(reportRows("WHERE r.reporter_id = ? ORDER BY r.created_at DESC LIMIT ?", userId, limit));
}

export function resolveReport(reportId: number, actorId?: number) {
  sqlite.prepare("UPDATE reports SET resolved_at = CURRENT_TIMESTAMP, resolved_by = COALESCE(?, resolved_by) WHERE id = ?").run(actorId ?? null, reportId);
}

function hydrateReports(reports: ReportRow[]) {
  return reports.map((report) => {
    const subject = getModerationSubject(report.subjectType, report.subjectId);
    return {
      ...report,
      subjectAuthorId: subject?.authorId ?? report.subjectAuthorId,
      subjectAuthorName: subject?.authorName ?? report.subjectAuthorName,
      subjectAuthorHandle: subject?.authorHandle ?? report.subjectAuthorHandle,
      subjectLabel: subject?.label ?? `${report.subjectType} #${report.subjectId}`,
      subjectUrl: subject?.url ?? null,
      subjectSummary: subject?.summary ?? "",
      subjectMissing: !subject,
      subjectCanDelete: Boolean(subject?.canDelete)
    } satisfies ReportItem;
  });
}

function reportRows(tail: string, ...params: unknown[]) {
  return sqlite.prepare(`${reportSelect} ${tail}`).all(...params) as ReportRow[];
}
