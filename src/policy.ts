export const defaultMedia = {
  pfp: "default",
  themeSong: "default.mp3"
};

export const systemIds = {
  defaultGroupId: 1
};

export const defaultProfileImageNames = new Set([defaultMedia.pfp]);

export const database = {
  busyTimeoutMs: 5000
};

export const session = {
  cookieName: "app_session",
  csrfCookieName: "app_csrf",
  tokenBytes: 36,
  csrfTokenBytes: 24,
  // 24h: long enough that an idle login or signup form still works when the
  // user comes back to it. The anon CSRF cookie grants no authority, so a
  // longer window is low impact.
  anonCsrfMaxAgeSeconds: 60 * 60 * 24,
  // 30 day persistent login.
  maxAgeSeconds: 30 * 60 * 60 * 24
};

export const themePreference = {
  cookieName: "app_theme",
  maxAgeSeconds: 60 * 60 * 24 * 365
};

export const friendshipStatus = {
  pending: "PENDING",
  accepted: "ACCEPTED"
} as const;

export const limits = {
  requestBytes: 12 * 1024 * 1024,
  uploadBytes: 10 * 1024 * 1024,
  passwordMin: 8,
  passwordMax: 256,
  usernameMin: 2,
  usernameMax: 50,
  handleMin: 3,
  handleMax: 40,
  emailMax: 254,
  shortText: 255,
  siteName: 80,
  siteTagline: 120,
  siteAnnouncement: 280,
  siteWelcomeText: 500,
  contactAddress: 500,
  searchQuery: 50,
  searchResults: 10,
  socialLinkUrl: 200,
  groupText: 500,
  postText: 2000,
  interest: 500,
  userText: 2000,
  skinHtml: 20000,
  contentBody: 20000,
  listPage: 50,
  newestPeople: 6,
  newestCommunities: 3,
  profileFrontRow: 8,
  profileBlogPreview: 5,
  profileWallPreview: 10,
  groupPostPreview: 20,
  feedPosts: 30,
  commentsPage: 20,
  exportRows: 1000
};

export const rateLimits = {
  pruneAfterSeconds: 60 * 60 * 48,
  message: "You are doing that too quickly. Try again soon.",
  actions: {
    "auth.login": { limit: 20, windowSeconds: 10 * 60 },
    "auth.signup": { limit: 5, windowSeconds: 60 * 60 },
    "auth.reset": { limit: 5, windowSeconds: 60 * 60 },
    "account.write": { limit: 30, windowSeconds: 10 * 60 },
    "profile.write": { limit: 20, windowSeconds: 10 * 60 },
    "post.create": { limit: 5, windowSeconds: 10 * 60 },
    "blog.create": { limit: 3, windowSeconds: 60 * 60 },
    "skin.create": { limit: 3, windowSeconds: 60 * 60 },
    "group.create": { limit: 3, windowSeconds: 60 * 60 },
    "comment.create": { limit: 15, windowSeconds: 10 * 60 },
    "message.send": { limit: 10, windowSeconds: 10 * 60 },
    "notification.write": { limit: 120, windowSeconds: 10 * 60 },
    "relationship.write": { limit: 120, windowSeconds: 10 * 60 },
    "engagement.write": { limit: 300, windowSeconds: 10 * 60 },
    "content.write": { limit: 60, windowSeconds: 10 * 60 },
    "report.create": { limit: 10, windowSeconds: 60 * 60 },
    "staff.write": { limit: 240, windowSeconds: 10 * 60 }
  }
} as const;

export type RateLimitAction = keyof typeof rateLimits.actions;

export const blogCategories = [
  "Art",
  "Automotive",
  "Fashion",
  "Financial",
  "Food",
  "Games",
  "Life",
  "Literature",
  "Math & science",
  "Movies & TV",
  "Music",
  "Paranormal",
  "Politics",
  "Humanity",
  "Romance",
  "Sports",
  "Technology",
  "Travel"
] as const;

export type BlogCategory = (typeof blogCategories)[number];
export const defaultBlogCategory: BlogCategory = "Life";

const blogCategorySet = new Set<string>(blogCategories);

export function isBlogCategory(value: string): value is BlogCategory {
  return blogCategorySet.has(value);
}

export const uploadSizeLabel = `${limits.uploadBytes / 1024 / 1024}MB`;

export const mediaAccept = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  audio: "audio/mpeg"
};

export const reservedHandles: ReadonlySet<string> = new Set([
  "abuse",
  "admin",
  "administrator",
  "quenq",
  "help",
  "moderator",
  "root",
  "security",
  "staff",
  "support",
  "system"
]);

const characterCountFormatter = new Intl.NumberFormat("en-US");

function characterCountLabel(count: number) {
  const unit = count === 1 ? "character" : "characters";
  return `${characterCountFormatter.format(count)} ${unit}`;
}

export function maxCharacterLimitLabel(maxLength: number) {
  return `Max ${characterCountLabel(maxLength)}`;
}

export function characterRangeLabel(minLength: number, maxLength: number) {
  return `${characterCountFormatter.format(minLength)} to ${characterCountLabel(maxLength)}`;
}

export function minimumCharacterLabel(minLength: number) {
  return `at least ${characterCountLabel(minLength)}`;
}

const reportSubjectTypeNames = [
  "user",
  "blog",
  "group",
  "skin",
  "message",
  "post",
  "post_comment",
  "blog_comment",
  "skin_comment"
] as const;

export type ReportSubjectType = (typeof reportSubjectTypeNames)[number];
export type CommentReportSubjectType = Extract<ReportSubjectType, `${string}_comment`>;
export type ContentReportSubjectType = Exclude<ReportSubjectType, CommentReportSubjectType>;
export type DeletableReportSubjectType = Exclude<ContentReportSubjectType, "user">;

const reportSubjectTypes: ReadonlySet<string> = new Set(reportSubjectTypeNames);

export function isReportSubjectType(value: string): value is ReportSubjectType {
  return reportSubjectTypes.has(value);
}

export function validUsername(value: string) {
  return value.length >= limits.usernameMin && value.length <= limits.usernameMax;
}

export function validPassword(value: string) {
  return value.length >= limits.passwordMin && value.length <= limits.passwordMax;
}

export function validEmail(value: string) {
  return value.length <= limits.emailMax && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function canonicalEmail(value: string) {
  const email = value.trim().toLowerCase();
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return email;

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (domain !== "gmail.com" && domain !== "googlemail.com") return email;

  local = local.split("+", 1)[0].replace(/\./g, "");
  if (!local) return email;
  domain = "gmail.com";
  return `${local}@${domain}`;
}

export function validHandle(value: string) {
  return value.length >= limits.handleMin && value.length <= limits.handleMax && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value);
}

export function reservedHandle(value: string) {
  return reservedHandles.has(value.trim().toLowerCase());
}
