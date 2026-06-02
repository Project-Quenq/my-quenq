import { raw } from "hono/html";
import type { BrandingSettings } from "../settings/branding.js";
import { defaultSiteSettings } from "../settings/site.js";
import { brandingSettings } from "../server/db/branding.js";
import { raidModeActive } from "../server/db/rateLimits.js";
import { siteSettings } from "../server/db/siteSettings.js";
import type { CurrentUser } from "../currentUser.js";
import type { PageSeo } from "../settings/seo.js";
import type { ProfileSkinPart } from "../skins/contract.js";
import { defaultColorPalette } from "../theme/colorPalette.js";
import { Icon } from "../ui/icons.js";
import { TimeZoneProvider } from "../ui/time.js";
import type { DataAttributes, ViewChild } from "../ui/types.js";
import { Footer } from "./footer.js";
import { Nav } from "./nav.js";
import { PageFrame } from "./page.js";
import { SeoHead } from "./seo.js";

export function Layout(props: {
  title: string;
  user: CurrentUser | null;
  bodyAttributes?: DataAttributes;
  browserThemeColor?: (branding: BrandingSettings) => string;
  head?: ViewChild;
  seo?: PageSeo;
  styles?: readonly string[];
  children: ViewChild;
}) {
  const settings = safeSiteSettings();
  const branding = safeBrandingSettings();
  const themeLocked = themeLockedFor(props.bodyAttributes, branding.customized);
  const skinActive = skinActiveFor(props.bodyAttributes);
  const htmlAttributes = themeLocked ? { "data-theme-lock": "light" } satisfies DataAttributes : undefined;
  const skinPart = skinPartAttributes(skinActive);
  const title = documentTitle(props.title, settings.identity.name);
  const browserThemeColor = props.browserThemeColor?.(branding);
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <TimeZoneProvider timeZone={props.user?.timeZone}>
        <html lang="en" {...htmlAttributes}>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <SeoHead
              branding={branding}
              documentTitle={title}
              pageTitle={props.title}
              seo={props.seo}
              settings={settings}
              themeColor={browserThemeColor}
            />
            <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            <link rel="manifest" href="/site.webmanifest" />
            <link rel="stylesheet" href="/static/css/style.css" />
            <link rel="stylesheet" href="/theme.css" />
            <link rel="stylesheet" href="/branding.css" />
            {props.styles?.map((href) => <link key={href} rel="stylesheet" href={href} />)}
            {props.head}

            <script async src="https://www.googletagmanager.com/gtag/js?id=G-FHVE5R5GH8"></script>
            <script>{raw(`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-FHVE5R5GH8');
            `)}</script>

          </head>
          <body {...props.bodyAttributes}>
            <div class="master-container" {...skinPart("shell")}>
              <Nav user={props.user} identity={settings.identity} hideThemeToggle={themeLocked} skinActive={skinActive} />
              <main {...skinPart("content")}>
                <RaidModeBanner />
                {props.children}
              </main>
              <Footer contact={settings.contact} dataAttributes={skinPart("footer")} />
            </div>
          </body>
        </html>
      </TimeZoneProvider>
    </>
  );
}

export function documentTitle(title: string, siteName: string) {
  const pageTitle = title.trim();
  const name = siteName.trim();
  if (!pageTitle) return name;
  if (!name || titleIncludesSiteName(pageTitle, name)) return pageTitle;
  return `${name} | ${pageTitle}`;
}

function titleIncludesSiteName(title: string, siteName: string) {
  return title === siteName || title.endsWith(` ${siteName}`) || title.endsWith(` | ${siteName}`) || title.startsWith(`${siteName} |`);
}

function safeSiteSettings() {
  try {
    return siteSettings();
  } catch {
    return defaultSiteSettings;
  }
}

function themeLockedFor(bodyAttributes: DataAttributes | undefined, brandingCustomized: boolean) {
  return Boolean(bodyAttributes && "data-skin-page" in bodyAttributes) || brandingCustomized;
}

function skinActiveFor(bodyAttributes?: DataAttributes) {
  return Boolean(bodyAttributes && "data-skin-page" in bodyAttributes);
}

function skinPartAttributes(active: boolean) {
  return (part: ProfileSkinPart): DataAttributes | undefined => active ? { "data-skin-part": part } : undefined;
}

function safeBrandingSettings(): BrandingSettings {
  try {
    return brandingSettings();
  } catch {
    return { customized: false, palette: defaultColorPalette, updatedAt: null };
  }
}

function RaidModeBanner() {
  if (!safeRaidModeActive()) return null;
  return (
    <p class="form-message form-message--error form-error raid-banner" role="alert">
      <Icon name="report" />
      <span>Raid mode is active. New signups and user actions are paused while moderators clean things up. Please come back later.</span>
    </p>
  );
}

function safeRaidModeActive() {
  try {
    return raidModeActive();
  } catch {
    return false;
  }
}

export function PlainPage(props: { user: CurrentUser | null; title: string; body: ViewChild; seo?: PageSeo }) {
  const body = typeof props.body === "string" || typeof props.body === "number" ? <p>{props.body}</p> : props.body;
  return (
    <Layout title={props.title} user={props.user} seo={props.seo}>
      <PageFrame title={props.title}>
        {body}
      </PageFrame>
    </Layout>
  );
}
