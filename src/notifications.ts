export const notificationKinds = {
  blogComment: "blog_comment",
  blogCommentFollowed: "blog_comment_followed",
  blogCommentReply: "blog_comment_reply",
  blogProp: "blog_prop",
  favorite: "favorite",
  friendAccepted: "friend_accepted",
  postComment: "post_comment",
  postCommentFollowed: "post_comment_followed",
  postCommentReply: "post_comment_reply",
  postProp: "post_prop",
  skinComment: "skin_comment",
  skinCommentFollowed: "skin_comment_followed",
  skinCommentReply: "skin_comment_reply",
  wallPost: "wall_post"
} as const;

export const notificationKindNames = Object.values(notificationKinds);
export type NotificationKind = (typeof notificationKindNames)[number];

export const notificationPreferenceTypes = {
  // Stored as wall_comments for compatibility with existing preference rows.
  comments: "wall_comments",
  favorites: "favorites",
  friendAccepts: "friend_accepts",
  props: "props",
  wallPosts: "wall_posts"
} as const;

export const notificationPreferenceTypeNames = Object.values(notificationPreferenceTypes);
export type NotificationPreferenceType = (typeof notificationPreferenceTypeNames)[number];
export type NotificationPreferences = Record<NotificationPreferenceType, boolean>;

export const commentNotificationKinds: ReadonlySet<NotificationKind> = new Set([
  notificationKinds.blogComment,
  notificationKinds.blogCommentFollowed,
  notificationKinds.blogCommentReply,
  notificationKinds.postComment,
  notificationKinds.postCommentFollowed,
  notificationKinds.postCommentReply,
  notificationKinds.skinComment,
  notificationKinds.skinCommentFollowed,
  notificationKinds.skinCommentReply
]);

export const notificationTextByKind = {
  [notificationKinds.blogComment]: "commented on your blog entry.",
  [notificationKinds.blogCommentFollowed]: "commented on a blog entry you commented on.",
  [notificationKinds.blogCommentReply]: "replied to your blog comment.",
  [notificationKinds.blogProp]: "gave props to your blog entry.",
  [notificationKinds.favorite]: "added you to favorites.",
  [notificationKinds.friendAccepted]: "accepted your friend request.",
  [notificationKinds.postComment]: "commented on your post.",
  [notificationKinds.postCommentFollowed]: "commented on a post you commented on.",
  [notificationKinds.postCommentReply]: "replied to your comment.",
  [notificationKinds.postProp]: "gave props to your post.",
  [notificationKinds.skinComment]: "commented on your skin.",
  [notificationKinds.skinCommentFollowed]: "commented on a skin you commented on.",
  [notificationKinds.skinCommentReply]: "replied to your skin comment.",
  [notificationKinds.wallPost]: "posted on your wall."
} satisfies Record<NotificationKind, string>;

export const notificationSubjectTypeNames = [
  "blog",
  "blog_comment",
  "post",
  "post_comment",
  "skin",
  "skin_comment",
  "user"
] as const;
export type NotificationSubjectType = (typeof notificationSubjectTypeNames)[number];

export const notificationContextTypeNames = ["blog", "post", "skin", "user"] as const;
export type NotificationContextType = (typeof notificationContextTypeNames)[number];
