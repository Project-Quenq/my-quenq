import { listAutomodRules } from "../../server/db/automod.js";
import { brandingSettings } from "../../server/db/branding.js";
import { emailOutbox } from "../../server/db/email.js";
import { auditLog, listReports, listResolvedReports } from "../../server/db/moderation/index.js";
import { listRateLimitSettings, raidModeActive } from "../../server/db/rateLimits.js";
import { siteSettings } from "../../server/db/siteSettings.js";
import { databaseTableCounts, staffBlogRows, staffFavoriteEdges, staffUserRows } from "../../server/db/staffDashboard.js";
import type { StaffUserRow } from "../../models.js";
import type { StaffSection } from "../../views/staff/index.js";

export function staffDashboardData(section: StaffSection, users?: StaffUserRow[]) {
  const show = (target: StaffSection) => section === "overview" || section === target;
  const showReports = show("reports");
  return {
    users: show("users") ? users ?? staffUserRows() : [],
    reports: showReports ? listReports() : [],
    resolvedReports: showReports ? listResolvedReports() : [],
    automodRules: show("automod") ? listAutomodRules() : [],
    counts: show("database") ? databaseTableCounts() : [],
    blogs: show("blog") ? staffBlogRows() : [],
    favorites: show("favorites") ? staffFavoriteEdges() : [],
    outbox: show("email") ? emailOutbox() : [],
    rateLimitSettings: show("rateLimits") ? listRateLimitSettings() : [],
    rateLimitRaidActive: show("rateLimits") ? raidModeActive() : false,
    colorTheme: show("siteSettings") ? brandingSettings() : null,
    siteSettings: show("siteSettings") ? siteSettings() : null,
    audit: show("audit") ? auditLog() : []
  };
}
