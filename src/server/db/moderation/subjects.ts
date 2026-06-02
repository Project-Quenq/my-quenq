import { plainTextFromHtml } from "../../security/html.js";
import { truncateText } from "../../../text.js";
import { commentSourceFor, subjectSourceFor, type SubjectRow } from "./subjectSources.js";

export { deleteModerationSubject } from "./subjectDelete.js";

export type ModerationSubject = {
  type: string;
  id: number;
  label: string;
  url: string | null;
  authorId: number | null;
  authorName: string | null;
  authorHandle: string | null;
  summary: string;
  canDelete: boolean;
};

export function commentTargetForSubject(type: string) {
  return commentSourceFor(type)?.target;
}

export function getModerationSubject(type: string, id: number): ModerationSubject | undefined {
  const comment = commentSubject(type, id);
  if (comment) return comment;
  const source = subjectSourceFor(type);
  return source ? subject(type, id, source.label, source.row(id), source.canDelete) : undefined;
}

function commentSubject(type: string, id: number) {
  const source = commentSourceFor(type);
  if (!source) return undefined;
  const data = source.row(id);
  return subject(type, id, source.label, data ? { ...data, url: source.url(Number(data.parentId), id) } : undefined, true);
}

function subject(type: string, id: number, label: string, data: SubjectRow | undefined, canDelete: boolean) {
  if (!data) return undefined;
  const title = data.title ? `${label}: ${data.title}` : label;
  const summary = data.receiverName
    ? `${summaryText(data)} To ${data.receiverName}.`
    : summaryText(data);
  return {
    type,
    id,
    label: `${title} #${id}`,
    url: data.url ?? null,
    authorId: data.authorId,
    authorName: data.authorName,
    authorHandle: data.authorHandle,
    summary,
    canDelete
  } satisfies ModerationSubject;
}

function summaryText(data: SubjectRow) {
  const parts = [data.title ?? "", plainTextFromHtml(data.bodyHtml ?? "")].filter(Boolean).join(": ");
  return truncateText(parts, 240);
}
