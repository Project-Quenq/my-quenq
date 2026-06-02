import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireModerator, requireProfile } from "../../server/access.js";
import { csrfToken } from "../../server/auth/session.js";
import { field } from "../../server/forms.js";
import { formId, routeId, verifiedActionForm } from "../../server/http.js";
import { moderateReport, moderateUserBan } from "../../server/moderation/actions.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { StaffPage } from "../../views/staff/index.js";
import { profilePath } from "../../paths.js";
import { staffDashboardData } from "../staff/dashboardData.js";
import { optionalReportNoteFromForm, reportActionFromValue } from "../staff/reportForm.js";

export function registerModerationRoutes(app: Hono<AppBindings>) {
  app.get("/moderation", moderationReportsPage);
  app.get("/moderation/reports", moderationReportsPage);
  app.post("/moderation/reports", moderationReportsAction);
  app.post("/moderation/users/:id/ban", moderationBanAction);
}

function moderationReportsPage(c: AppContext) {
  const user = requireModerator(c);
  return c.html(<StaffPage user={user} csrf={csrfToken(c)} section="reports" area="moderation" {...staffDashboardData("reports")} />);
}

async function moderationReportsAction(c: AppContext) {
  const user = requireModerator(c);
  const form = await verifiedActionForm(c, "staff.write");
  await moderateReport(user, formId(form), reportActionFromValue(field(form, "action")), optionalReportNoteFromForm(form));
  return c.redirect("/moderation/reports");
}

async function moderationBanAction(c: AppContext) {
  const user = requireModerator(c);
  const form = await verifiedActionForm(c, "staff.write");
  const target = moderateUserBan(user, routeId(c), banStateFromAction(field(form, "action")));
  return c.redirect(profilePath(requireProfile(target.id)));
}

function banStateFromAction(action: string) {
  if (action === "ban") return true;
  if (action === "unban") return false;
  throw new HTTPException(400, { message: "Unknown moderation action." });
}
