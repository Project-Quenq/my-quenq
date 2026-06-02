import type { RateLimitAction } from "./policy.js";

const rateLimitActionLabels: Record<RateLimitAction, string> = {
  "account.write": "Account settings",
  "auth.login": "Log in",
  "auth.reset": "Password reset",
  "auth.signup": "Sign up",
  "blog.create": "Blog posts",
  "comment.create": "Comments and replies",
  "content.write": "Content edits and deletes",
  "engagement.write": "Props and unprops",
  "group.create": "Group creation",
  "message.send": "Private messages",
  "notification.write": "Notifications",
  "post.create": "Feed and wall posts",
  "profile.write": "Profile edits",
  "relationship.write": "Relationships and group membership",
  "report.create": "Reports",
  "skin.create": "Shared skins",
  "staff.write": "Staff moderation actions"
};

export function rateLimitActionLabel(action: RateLimitAction) {
  return rateLimitActionLabels[action];
}
