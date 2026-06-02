import { HTTPException } from "hono/http-exception";
import { field } from "../../server/forms.js";
import type { ReportAction } from "../../server/moderation/actions.js";
import { limits } from "../../policy.js";
import { sanitizeUserText } from "../../server/security/html.js";

export function reportActionFromValue(value: string): ReportAction {
  if (value === "resolve" || value === "delete" || value === "ban_author" || value === "delete_and_ban") return value;
  throw new HTTPException(400, { message: "Unknown report action." });
}

export function optionalReportNoteFromForm(form: Record<string, unknown>) {
  const note = field(form, "note").slice(0, limits.userText);
  return note ? sanitizeUserText(note) : "";
}
