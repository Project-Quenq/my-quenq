import { HTTPException } from "hono/http-exception";
import { currentUser } from "../auth/session.js";
import { scanAutomodSubmission } from "../db/automod.js";
import { audit, auditSubjectMetadata } from "../db/moderation/index.js";
import { getModerationSubject } from "../db/moderation/subjects.js";
import { localBack, optionalFormId, requiredUserText, routeId, verifiedActionForm } from "../http.js";
import { canModerateAuthor } from "../moderation/guards.js";
import { limits, type ReportSubjectType } from "../../policy.js";
import { isAdminUser } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";
import type { AppContext } from "../context.js";

type AddComment = (textHtml: string, parentId?: number) => number | null;
type DeleteComment = (commentId: number, actorId: number, privileged: boolean) => boolean;

export async function addCommentFromForm(
  c: AppContext,
  user: CurrentUser,
  input: {
    add: AddComment;
    afterAdd?: (commentId: number) => void;
    form?: Record<string, unknown>;
    redirect: string | ((commentId: number) => string);
    subjectType: ReportSubjectType;
  }
) {
  const form = input.form ?? (await verifiedActionForm(c, "comment.create"));
  const textHtml = requiredUserText(form, "text", limits.userText, "Comment is required.");
  const automod = scanAutomodSubmission("comment", textHtml);

  const commentId = input.add(textHtml, optionalFormId(form, "parentId"));
  if (commentId === null) throw new HTTPException(400, { message: "You can only reply to top-level comments." });

  input.afterAdd?.(commentId);
  automod.createReports({ subjectType: input.subjectType, subjectId: commentId, authorId: user.id });
  return c.redirect(typeof input.redirect === "function" ? input.redirect(commentId) : input.redirect);
}

export async function deleteCommentFromRoute(
  c: AppContext,
  input: {
    delete: DeleteComment;
    fallback: string;
    redirectFragment?: string;
    subjectType: ReportSubjectType;
  }
) {
  const user = currentUser(c);
  if (!user) throw new HTTPException(302, { res: c.redirect("/login") });

  await verifiedActionForm(c, "content.write");
  const commentId = routeId(c);
  const subject = getModerationSubject(input.subjectType, commentId);
  const elevated = canModerateAuthor(user, subject?.authorId) && user.id !== subject?.authorId;

  if (!input.delete(commentId, user.id, isAdminUser(user) || elevated)) {
    throw new HTTPException(403, { message: "You cannot delete this comment." });
  }

  if (elevated) audit(user.id, "delete", input.subjectType, commentId, "", subject ? auditSubjectMetadata(subject) : {});
  return c.redirect(localBack(c, subject?.url ?? input.fallback, { fragment: input.redirectFragment }));
}
