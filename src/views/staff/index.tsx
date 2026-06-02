import type { AuditItem, AutomodRule, BlogItem, EmailOutboxItem, FavoriteEdge, RateLimitSetting, ReportItem, StaffUserRow, TableCount } from "../../models.js";
import type { BrandingSettings } from "../../settings/branding.js";
import type { SiteSettings } from "../../settings/site.js";
import { isAdminUser } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";
import { colorSwatchesStylesheet } from "../../ui/colorSwatches.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { AuditPanel } from "./audit.js";
import { AutomodPanel } from "./automod.js";
import { BlogToolsPanel } from "./blog.js";
import { DatabasePanel } from "./database.js";
import { EmailPanel } from "./email.js";
import { FavoritesPanel } from "./favorites.js";
import { adminLinks, moderationLinks, StaffSubnav } from "./nav.js";
import { RateLimitsPanel } from "./rateLimits.js";
import { ReportsPanel } from "./reports.js";
import { SiteSettingsPanel } from "./siteSettings.js";
import { UserSearch, UsersPanel } from "./users.js";

export { StaffUserDetailPage } from "./userDetail.js";

export type StaffSection = "overview" | "users" | "reports" | "automod" | "rateLimits" | "siteSettings" | "database" | "blog" | "favorites" | "email" | "audit";
type StaffArea = "admin" | "moderation";

type StaffPageProps = {
  user: CurrentUser;
  csrf: string;
  section: StaffSection;
  users: StaffUserRow[];
  reports: ReportItem[];
  resolvedReports: ReportItem[];
  automodRules: AutomodRule[];
  counts: TableCount[];
  blogs: BlogItem[];
  favorites: FavoriteEdge[];
  outbox: EmailOutboxItem[];
  rateLimitSettings: RateLimitSetting[];
  rateLimitRaidActive: boolean;
  colorTheme: BrandingSettings | null;
  siteSettings: SiteSettings | null;
  audit: AuditItem[];
  area?: StaffArea;
  openAutomodRuleId?: number;
  query?: string;
};

export function StaffPage(props: StaffPageProps) {
  const isAdmin = isAdminUser(props.user);
  const area = props.area ?? (isAdmin ? "admin" : "moderation");
  const title = area === "admin" && isAdmin ? "Admin" : "Moderation";
  const show = (section: StaffSection) => props.section === "overview" || props.section === section;
  const reportAction = area === "admin" ? "/admin/reports" : "/moderation/reports";

  return (
    <Layout title={title} user={props.user} styles={show("siteSettings") && isAdmin ? [colorSwatchesStylesheet] : undefined}>
      <PageFrame width="wide" title={title}>
        <StaffSubnav links={area === "admin" ? adminLinks : moderationLinks} />
        {show("users") ? <UserSearch query={props.query} /> : null}
        {show("reports") ? <ReportsPanel csrf={props.csrf} reports={props.reports} resolvedReports={props.resolvedReports} action={reportAction} /> : null}
        {show("automod") && isAdmin ? <AutomodPanel csrf={props.csrf} openRuleId={props.openAutomodRuleId} rules={props.automodRules} /> : null}
        {show("rateLimits") && isAdmin ? <RateLimitsPanel csrf={props.csrf} raidActive={props.rateLimitRaidActive} settings={props.rateLimitSettings} /> : null}
        {show("siteSettings") && isAdmin && props.colorTheme && props.siteSettings ? <SiteSettingsPanel csrf={props.csrf} colorTheme={props.colorTheme} siteSettings={props.siteSettings} /> : null}
        {show("users") ? <UsersPanel users={props.users} /> : null}
        {show("database") ? <DatabasePanel counts={props.counts} /> : null}
        {show("blog") ? <BlogToolsPanel csrf={props.csrf} blogs={props.blogs} /> : null}
        {show("favorites") ? <FavoritesPanel csrf={props.csrf} favorites={props.favorites} /> : null}
        {show("email") ? <EmailPanel csrf={props.csrf} outbox={props.outbox} /> : null}
        {show("audit") ? <AuditPanel audit={props.audit} /> : null}
      </PageFrame>
    </Layout>
  );
}
