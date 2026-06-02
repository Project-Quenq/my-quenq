import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAdmin } from "../../server/access.js";
import { isProtectedAdminAccount } from "../../server/adminProtection.js";
import { csrfToken } from "../../server/auth/session.js";
import { deleteBlog } from "../../server/db/blogs/index.js";
import { queueEmail } from "../../server/db/email.js";
import { audit, moderationSubjectAuditMetadata } from "../../server/db/moderation/index.js";
import { removeFavoriteEdge, searchStaffUserRows } from "../../server/db/staffDashboard.js";
import { getProfile } from "../../server/db/users.js";
import { field } from "../../server/forms.js";
import { formId, optionalId, queryText, requiredField, routeId, verifiedActionForm, verifiedForm } from "../../server/http.js";
import { moderateReport } from "../../server/moderation/actions.js";
import { limits, validEmail } from "../../policy.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { StaffPage, StaffUserDetailPage, type StaffSection } from "../../views/staff/index.js";
import { siteSettingsTargetId } from "../../views/staff/siteSettingsTargets.js";
import { staffDashboardData } from "../staff/dashboardData.js";
import { optionalReportNoteFromForm, reportActionFromValue } from "../staff/reportForm.js";
import { runSiteSettingsAction } from "./siteSettings.js";
import { runAutomodAction } from "./automodRules.js";
import { runManagedUserAction } from "./managedUsers.js";
import { runRateLimitAction } from "./rateLimits.js";

export function registerAdminRoutes(app: Hono<AppBindings>) {
  app.get("/admin", (c) => adminPage(c, "overview"));
  app.get("/admin/", (c) => adminPage(c, "overview"));
  app.get("/admin/users", (c) => adminPage(c, "users"));
  app.get("/admin/reports", (c) => adminPage(c, "reports"));
  app.get("/admin/automod", (c) => adminPage(c, "automod"));
  app.post("/admin/automod", adminAutomodAction);
  app.get("/admin/rate-limits", (c) => adminPage(c, "rateLimits"));
  app.post("/admin/rate-limits", adminRateLimitsAction);
  app.get("/admin/branding", (c) => adminPage(c, "siteSettings"));
  app.post("/admin/branding", adminSiteSettingsAction);
  app.get("/admin/database", (c) => adminPage(c, "database"));
  app.get("/admin/blog", (c) => adminPage(c, "blog"));
  app.get("/admin/favorites", (c) => adminPage(c, "favorites"));
  app.get("/admin/email", (c) => adminPage(c, "email"));
  app.get("/admin/audit", (c) => adminPage(c, "audit"));
  app.get("/admin/users/:id", adminUserPage);
  app.post("/admin/users/:id", adminUserAction);
  app.post("/admin/reports", adminReportsAction);
  app.post("/admin/blog/:id/delete", adminBlogDeleteAction);
  app.post("/admin/favorites/delete", adminFavoriteDeleteAction);
  app.post("/admin/email/send", adminEmailAction);
}

function adminPage(c: AppContext, section: StaffSection) {
  const user = requireAdmin(c);
  const openAutomodRuleId = section === "automod" ? optionalId(c.req.query("open")) || undefined : undefined;
  const query = section === "users" ? queryText(c, "q", limits.searchQuery) : "";
  const users = query ? searchStaffUserRows(query) : undefined;
  return c.html(
    <StaffPage
      user={user}
      csrf={csrfToken(c)}
      section={section}
      area="admin"
      openAutomodRuleId={openAutomodRuleId}
      {...staffDashboardData(section, users)}
      query={query}
    />
  );
}

function adminUserPage(c: AppContext) {
  const user = requireAdmin(c);
  const target = getProfile(routeId(c));
  if (!target) return c.redirect("/admin/users");
  return c.html(<StaffUserDetailPage user={user} csrf={csrfToken(c)} target={target} protectedAdmin={isProtectedAdminAccount(target)} />);
}

async function adminUserAction(c: AppContext) {
  const user = requireAdmin(c);
  const form = await verifiedActionForm(c, "staff.write");
  const target = getProfile(routeId(c));
  if (!target) return c.redirect("/admin/users");
  const action = await runManagedUserAction(user, form, target);
  audit(user.id, action, "user", target.id);
  return c.redirect(`/admin/users/${target.id}`);
}

async function adminAutomodAction(c: AppContext) {
  const user = requireAdmin(c);
  const form = await verifiedActionForm(c, "staff.write");
  const result = runAutomodAction(user, form);
  audit(user.id, result.action, "automod_rule", result.ruleId, "", result.metadata ?? {});
  return c.redirect(automodActionRedirect(result));
}

async function adminRateLimitsAction(c: AppContext) {
  const user = requireAdmin(c);
  const form = await verifiedForm(c);
  runRateLimitAction(user, form);
  return c.redirect("/admin/rate-limits");
}

async function adminSiteSettingsAction(c: AppContext) {
  const user = requireAdmin(c);
  const form = await verifiedActionForm(c, "staff.write");
  await runSiteSettingsAction(user, form);
  return c.redirect(adminSiteSettingsRedirect(form));
}

async function adminReportsAction(c: AppContext) {
  const user = requireAdmin(c);
  const form = await verifiedActionForm(c, "staff.write");
  await moderateReport(user, formId(form), reportActionFromValue(field(form, "action")), optionalReportNoteFromForm(form));
  return c.redirect("/admin/reports");
}

async function adminBlogDeleteAction(c: AppContext) {
  const user = requireAdmin(c);
  await verifiedActionForm(c, "staff.write");
  const blogId = routeId(c);
  const auditMetadata = moderationSubjectAuditMetadata("blog", blogId);
  if (!deleteBlog(blogId, user.id, true)) throw new HTTPException(404, { message: "Blog entry not found." });
  audit(user.id, "delete", "blog", blogId, "", auditMetadata);
  return c.redirect("/admin/blog");
}

async function adminFavoriteDeleteAction(c: AppContext) {
  const user = requireAdmin(c);
  const form = await verifiedActionForm(c, "staff.write");
  const userId = formId(form, "userId");
  const favoriteId = formId(form, "favoriteId");
  if (!removeFavoriteEdge(userId, favoriteId)) throw new HTTPException(404, { message: "Favorite not found." });
  audit(user.id, "delete", "favorite", favoriteId);
  return c.redirect("/admin/favorites");
}

async function adminEmailAction(c: AppContext) {
  const user = requireAdmin(c);
  const form = await verifiedActionForm(c, "staff.write");
  const to = field(form, "to").toLowerCase();
  if (!validEmail(to)) throw new HTTPException(400, { message: "Use a valid email address." });
  const email = await queueEmail(
    to,
    requiredField(form, "subject", limits.shortText, "Subject is required."),
    requiredField(form, "body", limits.userText, "Body is required.")
  );
  audit(user.id, "queue", "email", email.id);
  return c.redirect("/admin/email");
}

function automodActionRedirect(result: { action: string; ruleId: number }) {
  if (result.action === "delete") return "/admin/automod#automod-rules";
  return `/admin/automod?open=${result.ruleId}#automod-rule-${result.ruleId}`;
}

function adminSiteSettingsRedirect(form: Record<string, unknown>) {
  const targetId = siteSettingsTargetId(field(form, "mode"));
  return targetId ? `/admin/branding#${targetId}` : "/admin/branding";
}
