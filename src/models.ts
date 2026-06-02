import type { AutomodAction, AutomodPatternType, AutomodScope } from "./automodPolicy.js";
import type { AuditSubjectType } from "./auditLabels.js";
import type { CurrentUser } from "./currentUser.js";
import type { NotificationContextType, NotificationKind, NotificationSubjectType } from "./notifications.js";
import type { BlogCategory, friendshipStatus, RateLimitAction, ReportSubjectType } from "./policy.js";
import type { SocialLinks } from "./socialLinks.js";

export type { AutomodAction, AutomodPatternType, AutomodScope } from "./automodPolicy.js";

export const defaultInterestNames = ["General", "Music", "Movies", "Television", "Books", "Heroes"] as const;

export const defaultInterests = {
  General: "",
  Music: "",
  Movies: "",
  Television: "",
  Books: "",
  Heroes: ""
} satisfies Record<(typeof defaultInterestNames)[number], string>;

export const defaultStatus = {
  status: "",
  currentVibe: ""
};

export type UserProfile = CurrentUser & {
  createdAt: string;
  handle: string;
  bioHtml: string;
  skinHtml: string;
  interests: typeof defaultInterests;
  socialLinks: SocialLinks;
  status: typeof defaultStatus;
  pfp: string;
  themeSong: string;
  currentGroupId: number | null;
  private: boolean;
  views: number;
};

export type PersonCard = {
  id: number;
  username: string;
  handle: string;
  pfp: string;
};

export type CommentItem = {
  id: number;
  textHtml: string;
  createdAt: string;
  authorId: number;
  authorRole: string;
  authorHandle: string;
  authorSkinHtml: string;
  username: string;
  pfp: string;
  parentId: number | null;
};

export type Friendship = {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: (typeof friendshipStatus)[keyof typeof friendshipStatus];
};

export type BlogItem = {
  id: number;
  title: string;
  bodyHtml: string;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  authorRole: string;
  authorHandle: string;
  username: string;
  category: BlogCategory;
  privacyLevel: number;
  pinned: number;
  propsCount: number;
  commentCount: number;
  proppedByViewer: number;
  commentsEnabled: number;
};

export type BlogPreview = Pick<BlogItem, "id" | "title" | "bodyHtml" | "createdAt" | "updatedAt" | "category" | "privacyLevel" | "pinned" | "propsCount" | "commentCount" | "proppedByViewer" | "commentsEnabled">;
export type BlogListItem = BlogPreview & Partial<Pick<BlogItem, "authorId" | "authorRole" | "authorHandle" | "username">>;
export type StaffUserRow = CurrentUser & {
  createdAt: string;
  handle: string;
  pfp: string;
  views: number;
  verifiedAt: string | null;
  bannedAt: string | null;
};

export type GroupItem = {
  id: number;
  name: string;
  descriptionHtml: string;
  createdAt: string;
  ownerId: number;
  ownerRole: string;
  ownerHandle: string;
  ownerName: string;
  memberCount: number;
};

export type GroupMember = PersonCard & {
  role: string;
  joinedAt: string;
};

export type PostCommentBumpActor = {
  id: number;
  handle: string;
  name: string;
};

export type PostCommentBump = {
  commentedAt: string;
  commenterCount: number;
  actors: PostCommentBumpActor[];
};

export type PostItem = {
  id: number;
  bodyHtml: string;
  mediaFilename: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  authorRole: string;
  authorHandle: string;
  authorSkinHtml: string;
  username: string;
  pfp: string;
  wallUserId: number | null;
  wallUserHandle: string | null;
  wallUsername: string | null;
  groupId: number | null;
  groupName: string | null;
  groupOwnerId: number | null;
  propCount: number;
  commentCount: number;
  proppedByViewer: number;
  viewerCanInteract: number;
  commentBump?: PostCommentBump | null;
};

export type ReportItem = {
  id: number;
  reporterId: number | null;
  reporterName: string | null;
  reporterHandle: string | null;
  subjectAuthorId: number | null;
  subjectAuthorName: string | null;
  subjectAuthorHandle: string | null;
  subjectType: ReportSubjectType;
  subjectId: number;
  subjectLabel: string;
  subjectUrl: string | null;
  subjectSummary: string;
  subjectMissing: boolean;
  subjectCanDelete: boolean;
  reasonHtml: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
};

export type MessageItem = {
  id: number;
  senderId: number;
  senderName: string;
  senderHandle: string;
  senderPfp: string;
  receiverId: number;
  receiverName: string;
  receiverHandle: string;
  subject: string;
  bodyHtml: string;
  readAt: string | null;
  createdAt: string;
};

export type MessageConversation = {
  id: number;
  otherUserId: number;
  otherName: string;
  otherHandle: string;
  otherPfp: string;
  latestSenderId: number;
  latestSubject: string;
  unreadCount: number;
  createdAt: string;
};

export type NotificationItem = {
  id: number;
  recipientId: number;
  actorId: number;
  actorName: string;
  actorHandle: string;
  kind: NotificationKind;
  subjectType: NotificationSubjectType;
  subjectId: number;
  contextType: NotificationContextType;
  contextId: number;
  contextPostAuthorId: number | null;
  contextPostWallUserId: number | null;
  contextTitle: string | null;
  readAt: string | null;
  createdAt: string;
};

export type SkinItem = {
  id: number;
  sourceKey: string | null;
  title: string;
  descriptionHtml: string;
  codeHtml: string;
  createdAt: string;
  updatedAt: string;
  authorId: number | null;
  authorRole: string;
  authorHandle: string;
  username: string;
  commentCount: number;
};

export type TableCount = {
  name: string;
  count: number;
};

export type FavoriteEdge = {
  userId: number;
  username: string;
  userHandle: string;
  favoriteId: number;
  favoriteName: string;
  favoriteHandle: string;
  createdAt: string;
};

export type AuditItem = {
  id: number;
  actorId: number | null;
  actorName: string | null;
  actorHandle: string | null;
  action: string;
  subjectType: AuditSubjectType;
  subjectId: number;
  subjectLabel: string;
  subjectUrl: string | null;
  subjectSummary: string;
  subjectMissing: boolean;
  subjectAuthorId: number | null;
  subjectAuthorName: string | null;
  subjectAuthorHandle: string | null;
  reasonHtml: string;
  metadataJson: string;
  createdAt: string;
};

export type AutomodRule = {
  id: number;
  name: string;
  pattern: string;
  patternType: AutomodPatternType;
  scope: AutomodScope;
  action: AutomodAction;
  enabled: number;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomodMatch = {
  rule: AutomodRule;
};

export type EmailOutboxItem = {
  id: number;
  toEmail: string;
  subject: string;
  bodyText: string;
  sentAt: string | null;
  deliveryError: string | null;
  createdAt: string;
};

export type RateLimitSetting = {
  action: RateLimitAction;
  limit: number;
  windowSeconds: number;
  defaultLimit: number;
  defaultWindowSeconds: number;
  overridden: boolean;
  updatedAt: string | null;
};
