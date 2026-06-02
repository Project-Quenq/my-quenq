import { Icon, type IconName } from "../../ui/icons.js";

type StaffSectionLink = {
  readonly label: string;
  readonly href: string;
  readonly icon: IconName;
};

export const adminLinks: readonly StaffSectionLink[] = [
  { label: "Users", href: "/admin/users", icon: "user" },
  { label: "Reports", href: "/admin/reports", icon: "report" },
  { label: "Automod", href: "/admin/automod", icon: "audit" },
  { label: "Rate limits", href: "/admin/rate-limits", icon: "rate-limit" },
  { label: "Site settings", href: "/admin/branding", icon: "settings" },
  { label: "Database", href: "/admin/database", icon: "database" },
  { label: "Blog", href: "/admin/blog", icon: "blog" },
  { label: "Favorites", href: "/admin/favorites", icon: "favorite" },
  { label: "Email outbox", href: "/admin/email", icon: "email" },
  { label: "Audit", href: "/admin/audit", icon: "audit" }
];

export const moderationLinks: readonly StaffSectionLink[] = [
  { label: "Reports", href: "/moderation/reports", icon: "report" }
];

export function StaffSubnav({ links }: { links: readonly StaffSectionLink[] }) {
  return (
    <p class="staff-subnav">
      {links.map((link) => (
        <span class="staff-subnav__item">
          <a href={link.href}><Icon name={link.icon} /><span>{link.label}</span></a>
        </span>
      ))}
    </p>
  );
}
