import { HTTPException } from "hono/http-exception";
import { assertMutableManagedUser } from "../adminProtection.js";
import { revokeUserSessions } from "../auth/session.js";
import { audit, auditSubjectMetadata, getReport, resolveReport } from "../db/moderation/index.js";
import { deleteModerationSubject, getModerationSubject } from "../db/moderation/subjects.js";
import { getCurrentUser, setUserBanned } from "../db/users.js";
import { canBanUsers, canModerateContent, canModerateTarget, canViewReports } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";
import type { ReportItem } from "../../models.js";
import type { ReportSubjectType } from "../../policy.js";

export type ReportAction = "resolve" | "delete" | "ban_author" | "delete_and_ban";
type ReportActionInput = { actor: CurrentUser; report: ReportItem; reasonHtml: string };

const reportActionHandlers = {
  resolve: ({ actor, report, reasonHtml }: ReportActionInput) => {
    resolveReport(report.id, actor.id);
    audit(actor.id, "resolve", "report", report.id, reasonHtml);
  },
  delete: async ({ actor, report, reasonHtml }: ReportActionInput) => {
    await deleteReportedSubject(actor, report.subjectType, report.subjectId, report.id, reasonHtml);
    resolveReport(report.id, actor.id);
  },
  ban_author: ({ actor, report, reasonHtml }: ReportActionInput) => {
    banReportedAuthor(actor, reportAuthorId(report), report.id, reasonHtml);
    resolveReport(report.id, actor.id);
  },
  delete_and_ban: async ({ actor, report, reasonHtml }: ReportActionInput) => {
    const authorId = reportAuthorId(report);
    await deleteReportedSubject(actor, report.subjectType, report.subjectId, report.id, reasonHtml);
    banReportedAuthor(actor, authorId, report.id, reasonHtml);
    resolveReport(report.id, actor.id);
  }
} satisfies Record<ReportAction, (input: ReportActionInput) => void | Promise<void>>;

export async function moderateReport(actor: CurrentUser, reportId: number, action: ReportAction, reasonHtml = "") {
  if (!canViewReports(actor)) throw new HTTPException(403, { message: "Moderation access required." });
  const report = getReport(reportId);
  if (!report) throw new HTTPException(404, { message: "Report not found." });
  if (report.resolvedAt) throw new HTTPException(400, { message: "Report is already resolved." });
  await reportActionHandlers[action]({ actor, report, reasonHtml });
}

export function moderateUserBan(
  actor: CurrentUser,
  targetId: number,
  banned: boolean,
  reasonHtml = "",
  metadata: Record<string, unknown> = {}
) {
  if (!canBanUsers(actor)) throw new HTTPException(403, { message: "Ban access required." });
  const target = getCurrentUser(targetId);
  if (!target) throw new HTTPException(404, { message: "User not found." });
  assertMutableManagedUser(target);
  if (!canModerateTarget(actor, target)) throw new HTTPException(403, { message: "You cannot moderate this user." });
  setUserBanned(target.id, banned);
  if (banned) revokeUserSessions(target.id);
  audit(actor.id, banned ? "ban" : "unban", "user", target.id, reasonHtml, metadata);
  return target;
}

function reportAuthorId(report: ReportItem) {
  return report.subjectAuthorId ?? getModerationSubject(report.subjectType, report.subjectId)?.authorId ?? null;
}

async function deleteReportedSubject(actor: CurrentUser, subjectType: ReportSubjectType, subjectId: number, reportId: number, reasonHtml: string) {
  if (!canModerateContent(actor)) throw new HTTPException(403, { message: "Moderation access required." });
  const subject = getModerationSubject(subjectType, subjectId);
  if (!subject) throw new HTTPException(404, { message: "Report subject not found." });
  if (!subject.canDelete) throw new HTTPException(400, { message: "This report subject cannot be deleted." });
  assertCanModerateAuthor(actor, subject.authorId);
  if (!(await deleteModerationSubject(subjectType, subjectId, actor.id))) {
    throw new HTTPException(404, { message: "Report subject was already removed." });
  }
  audit(actor.id, "delete", subjectType, subjectId, reasonHtml, { reportId, ...auditSubjectMetadata(subject) });
}

function banReportedAuthor(actor: CurrentUser, subjectAuthorId: number | null, reportId: number, reasonHtml: string) {
  if (!subjectAuthorId) throw new HTTPException(400, { message: "Report subject author is unknown." });
  moderateUserBan(actor, subjectAuthorId, true, reasonHtml, { reportId });
}

function assertCanModerateAuthor(actor: CurrentUser, authorId: number | null) {
  if (!authorId) throw new HTTPException(400, { message: "Report subject author is unknown." });
  const target = getCurrentUser(authorId);
  if (!target) throw new HTTPException(404, { message: "Report subject author no longer exists." });
  if (!canModerateTarget(actor, target)) throw new HTTPException(403, { message: "You cannot moderate this user's content." });
}
