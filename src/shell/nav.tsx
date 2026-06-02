import type { SiteIdentitySettings } from "../settings/site.js";
import { mainNavPageOrder, pageLinks } from "../navigation.js";
import { notificationsPath } from "../paths.js";
import { hasPermission, type Permission } from "../roles.js";
import { unreadMessageCount } from "../server/db/messages/index.js";
import { unreadNotificationCount } from "../server/db/notifications/index.js";
import type { CurrentUser } from "../currentUser.js";
import type { ProfileSkinPart } from "../skins/contract.js";
import { ActionLabel } from "../ui/actions.js";
import { CountBadge } from "../ui/badges.js";
import { Icon, SvgIcon } from "../ui/icons.js";
import { InlineLinks, type LinkItem } from "../ui/links.js";
import type { DataAttributes } from "../ui/types.js";

type StaffMenuPage = {
  readonly label: string;
  readonly href: string;
  readonly permission: Permission;
};

const staffMenuPages: readonly StaffMenuPage[] = [
  { label: "Admin", href: "/admin", permission: "admin" },
  { label: "Moderation", href: "/moderation", permission: "moderateReports" }
];

export function Nav({ hideThemeToggle, identity, skinActive, user }: { hideThemeToggle?: boolean; identity: SiteIdentitySettings; skinActive?: boolean; user: CurrentUser | null }) {
  const staffLink = user ? staffMenuLinkFor(user) : null;
  const messageCount = user ? safeUnreadMessageCount(user.id) : 0;
  const notificationCount = user ? safeUnreadNotificationCount(user.id) : 0;
  const utilityLinks = [
    ...(user ? [<NotificationsLink count={notificationCount} />, <SettingsLink />] : []),
    ...(hideThemeToggle ? [] : [<ThemeToggle />]),
    <RefreshLink />
  ];
  const skinPart = skinPartAttributes(Boolean(skinActive));
  const navItems = mainNavPageOrder.map((key) => {
    const page = pageLinks[key];
    return { href: key === "home" && user ? "/home" : page.href, key, label: page.label };
  });
  const accountLinks: LinkItem[] = user
    ? [...(staffLink ? [staffLink] : []), ["Help", "/help"], ["Log out", "/logout"]]
    : [["Help", "/help"], ["Log in", "/login"], ["Sign up", "/signup"]];

  return (
    <header {...skinPart("header")}>
      <nav class="site-nav" {...skinPart("navigation")}>
        <div class="site-nav__top" {...skinPart("navigation-top")}>
          <div class="site-nav__brand" {...skinPart("brand")}>
            <a class="brand-link" href="/" aria-label={identity.name}>
              <SvgIcon svg={identity.headerIconSvg} />
              <span class="brand-link__copy">
                <span class="brand-link__name">{identity.name}</span>
                {identity.tagline ? <span class="brand-link__tagline">{identity.tagline}</span> : null}
              </span>
            </a>
          </div>
          <div class="site-nav__search" {...skinPart("search")}>
            <form action="/search" method="get">
              <input id="nav-search" type="text" name="q" autocomplete="off" aria-label="Search" />
              <button type="submit"><ActionLabel action="search">Search</ActionLabel></button>
            </form>
          </div>
          <div class="site-nav__account" {...skinPart("account")}>
            <InlineLinks links={accountLinks} prefix={utilityLinks} />
          </div>
        </div>
        <ul class="site-nav__links link-list" {...skinPart("navigation-links")}>
          {navItems.map((item) => (
            <li>
              <a href={item.href}>
                <span class="site-nav__link-label">
                  <span>{item.label}</span>
                  {user && item.key === "messages" && messageCount ? (
                    <CountBadge className="site-nav__link-badge" count={messageCount} label={`${messageCount} unread messages`} tone="attention" />
                  ) : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function skinPartAttributes(active: boolean) {
  return (part: ProfileSkinPart): DataAttributes | undefined => active ? { "data-skin-part": part } : undefined;
}

function staffMenuLinkFor(user: CurrentUser): LinkItem | null {
  const page = staffMenuPages.find((item) => hasPermission(user, item.permission));
  return page ? [page.label, page.href] : null;
}

function RefreshLink() {
  return (
    <a class="site-nav__icon-link" href="/refresh" aria-label="Refresh page" title="Refresh page">
      <Icon name="refresh" />
    </a>
  );
}

function ThemeToggle() {
  return (
    <a class="site-nav__icon-link theme-toggle" href="/theme" aria-label="Toggle color theme" title="Toggle color theme">
      <span class="theme-toggle__icon theme-toggle__icon--dark">
        <Icon name="moon" />
      </span>
      <span class="theme-toggle__icon theme-toggle__icon--light">
        <Icon name="sun" />
      </span>
    </a>
  );
}

function NotificationsLink({ count }: { count: number }) {
  return (
    <a
      class="site-nav__icon-link site-nav__notification-link"
      href={notificationsPath}
      aria-label={count ? `${count} unread notifications` : "Notifications"}
      title="Notifications"
    >
      <Icon name="notifications" />
      {count ? <CountBadge className="site-nav__notification-badge" count={count} tone="attention" /> : null}
    </a>
  );
}

function SettingsLink() {
  return (
    <a class="site-nav__icon-link" href="/settings" aria-label="Settings" title="Settings">
      <Icon name="settings" />
    </a>
  );
}

function safeUnreadNotificationCount(userId: number) {
  try {
    return unreadNotificationCount(userId);
  } catch {
    return 0;
  }
}

function safeUnreadMessageCount(userId: number) {
  try {
    return unreadMessageCount(userId);
  } catch {
    return 0;
  }
}
