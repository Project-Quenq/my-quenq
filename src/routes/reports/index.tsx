import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAuth, requireBlog, requireGroup, requireSkin, visibleProfile } from "../../server/access.js";
import { csrfToken } from "../../server/auth/session.js";
import { canViewBlog } from "../../server/db/blogs/index.js";
import { commentParentId } from "../../server/db/comments.js";
import { canViewGroup } from "../../server/db/groups.js";
import { canViewMessage } from "../../server/db/messages/index.js";
import { createReport } from "../../server/db/moderation/index.js";
import { commentTargetForSubject, getModerationSubject } from "../../server/db/moderation/subjects.js";
import { getVisiblePost } from "../../server/db/posts/index.js";
import { field } from "../../server/forms.js";
import { badFormRequestMessage, optionalId, optionalReportSubjectType, requiredReportSubjectType, requiredUserText, verifiedActionForm } from "../../server/http.js";
import { limits, type ReportSubjectType } from "../../policy.js";
import { reportPathBase } from "../../paths.js";
import type { CurrentUser } from "../../currentUser.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { ReportPage } from "../../views/reports/index.js";

export function registerReportRoutes(app: Hono<AppBindings>) {
  app.get(reportPathBase, (c) => {
    const user = requireAuth(c);
    const subjectType = optionalReportSubjectType(c.req.query("type"));
    const subjectId = optionalId(c.req.query("id"));
    if (!subjectType || !subjectId) return reportPage(c, user, undefined, undefined, "Open a report link from the page you want to report.", 400);
    assertReportSubject(c, user, subjectType, subjectId);
    return reportPage(c, user, subjectType, subjectId);
  });

  app.post(reportPathBase, async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "report.create");
    try {
      const subjectType = requiredReportSubjectType(field(form, "type"));
      const subjectId = requiredReportSubjectId(form);
      assertReportSubject(c, user, subjectType, subjectId);
      const subject = getModerationSubject(subjectType, subjectId);
      createReport(user.id, subjectType, subjectId, requiredUserText(form, "reason", limits.userText, "Report reason is required."), subject?.authorId);
      return reportPage(c, user, subjectType, subjectId, undefined, 200, "Report sent.");
    } catch (error) {
      const message = badFormRequestMessage(error);
      if (message) {
        return reportPage(c, user, optionalReportSubjectType(field(form, "type")), optionalId(field(form, "id")), message, 400);
      }
      throw error;
    }
  });
}

function reportPage(c: AppContext, user: CurrentUser, subjectType?: ReportSubjectType, subjectId?: number, error?: string, status: 200 | 400 = 200, message?: string) {
  return c.html(<ReportPage user={user} csrf={csrfToken(c)} subjectType={subjectType} subjectId={subjectId || undefined} error={error} message={message} />, status);
}

function requiredReportSubjectId(form: Record<string, unknown>) {
  const subjectId = optionalId(field(form, "id"));
  if (!subjectId) throw new HTTPException(400, { message: "Report subject is required." });
  return subjectId;
}

function assertReportSubject(c: AppContext, user: CurrentUser, subjectType: ReportSubjectType, subjectId: number) {
  const commentTarget = commentTargetForSubject(subjectType);
  if (commentTarget) {
    const parentId = commentParentId(commentTarget, subjectId, user);
    if (!parentId) throw new HTTPException(404, { message: "Report subject not found." });
    assertReportSubject(c, user, commentTarget, parentId);
    return;
  }

  switch (subjectType) {
    case "post":
      if (!getVisiblePost(subjectId, user)) throw new HTTPException(404, { message: "Report subject not found." });
      return;
    case "user":
      visibleProfile(c, subjectId);
      return;
    case "blog": {
      const blog = requireBlog(subjectId);
      visibleProfile(c, blog.authorId);
      if (!canViewBlog(user, blog)) throw new HTTPException(403, { message: "You cannot report this blog entry." });
      return;
    }
    case "group": {
      const group = requireGroup(subjectId);
      visibleProfile(c, group.ownerId);
      if (!canViewGroup(user, group.id)) throw new HTTPException(404, { message: "Report subject not found." });
      return;
    }
    case "skin": {
      const skin = requireSkin(subjectId);
      if (skin.authorId !== null) visibleProfile(c, skin.authorId);
      return;
    }
    case "message":
      if (!canViewMessage(user.id, subjectId)) throw new HTTPException(404, { message: "Report subject not found." });
      return;
    default:
      throw new HTTPException(400, { message: "Unknown report subject." });
  }
}
