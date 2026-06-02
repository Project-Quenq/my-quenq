import type { ReportSubjectType } from "./policy.js";

type ProfileTarget = string | { handle: string };
type IdTarget = number | { id: number };
type NewMessagePathOptions = {
  forward?: "profile";
  id?: number;
  mode?: "instant";
  subject?: string;
  to?: string;
};

export const conversationsBeforeParam = "conversationsBefore";
export const messagesPath = "/messages";
export const newMessagePathBase = `${messagesPath}/new`;
export const notificationsPath = "/notifications";
export const reportPathBase = "/report";

function profileHandle(target: ProfileTarget) {
  return typeof target === "string" ? target : target.handle;
}

function idValue(target: IdTarget) {
  return typeof target === "number" ? target : target.id;
}

function segment(value: string | number) {
  return encodeURIComponent(String(value));
}

export const profilePath = (target: ProfileTarget) => `/u/${segment(profileHandle(target))}`;
export const profileBlogPath = (target: ProfileTarget) => `${profilePath(target)}/blog`;
export const profileFriendsPath = (target: ProfileTarget) => `${profilePath(target)}/friends`;
export const profileWallPath = (target: ProfileTarget) => `${profilePath(target)}/wall`;
export const groupPath = (target: IdTarget) => `/g/${segment(idValue(target))}`;
export const blogPath = (target: IdTarget) => `/b/${segment(idValue(target))}`;
export const blogCommentsPath = (target: IdTarget) => `${blogPath(target)}/comments`;
export const postPath = (target: IdTarget) => `/p/${segment(idValue(target))}`;
export const postCommentsPath = (target: IdTarget) => `${postPath(target)}/comments`;
export const skinPath = (target: IdTarget) => `/s/${segment(idValue(target))}`;
export const skinCommentsPath = (target: IdTarget) => `${skinPath(target)}/comments`;

export function reportPath(type: ReportSubjectType, target: IdTarget) {
  const params = new URLSearchParams({ type, id: String(idValue(target)) });
  return `${reportPathBase}?${params.toString()}`;
}

export function messageConversationPath(handle: string, conversationsBefore?: string | null) {
  const params = new URLSearchParams({ with: handle });
  if (conversationsBefore) params.set(conversationsBeforeParam, conversationsBefore);
  return `${messagesPath}?${params.toString()}`;
}

export function messageDeletePath(target: IdTarget) {
  return `${messagesPath}/${segment(idValue(target))}/delete`;
}

export function newMessagePath(options: NewMessagePathOptions = {}) {
  const params = new URLSearchParams();
  if (options.to) params.set("to", options.to);
  if (options.forward) params.set("forward", options.forward);
  if (options.id) params.set("id", String(options.id));
  if (options.mode) params.set("mode", options.mode);
  if (options.subject) params.set("subject", options.subject);
  const query = params.toString();
  return query ? `${newMessagePathBase}?${query}` : newMessagePathBase;
}

const mediaPath = (bucket: string, filename: string) => `${bucket}/${encodeURIComponent(filename)}`;

export const profileImagePath = (filename: string) => mediaPath("/media/pfp", filename);
export const postImagePath = (filename: string) => mediaPath("/media/post-images", filename);
export const themeSongPath = (filename: string) => mediaPath("/media/theme-songs", filename);
