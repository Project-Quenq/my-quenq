const auditActionLabels: Record<string, string> = {
  ban: "Banned",
  create: "Created",
  delete: "Deleted",
  disable: "Disabled",
  disable_raid_mode: "Disabled raid mode",
  enable: "Enabled",
  enable_raid_mode: "Enabled raid mode",
  password: "Changed password",
  queue: "Queued",
  reset: "Reset",
  reset_color_theme: "Reset color theme",
  resolve: "Resolved",
  role: "Changed role",
  unban: "Unbanned",
  update: "Updated",
  update_color_theme: "Updated color theme",
  update_site_contact: "Updated contact settings",
  update_site_home: "Updated home page",
  update_site_identity: "Updated site identity",
  verify: "Verified"
};

const auditSubjectTypeLabels = {
  app_setting: "Site setting",
  automod_rule: "Automod rule",
  blog: "Blog entry",
  blog_comment: "Blog comment",
  email: "Email",
  favorite: "Favorite",
  group: "Group",
  message: "Private message",
  post: "Post",
  post_comment: "Post comment",
  rate_limit: "Rate limits",
  report: "Report",
  skin: "Skin",
  skin_comment: "Skin comment",
  user: "Profile"
} as const;

export type AuditSubjectType = keyof typeof auditSubjectTypeLabels;

export function auditActionLabel(action: string) {
  return auditActionLabels[action] ?? readableToken(action);
}

export function subjectTypeLabel(type: string) {
  return isAuditSubjectType(type) ? auditSubjectTypeLabels[type] : readableToken(type);
}

export function isAuditSubjectType(type: string): type is AuditSubjectType {
  return Object.hasOwn(auditSubjectTypeLabels, type);
}

function readableToken(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || value;
}
