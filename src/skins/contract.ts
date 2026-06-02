export const profileSkinVersion = "2026";

const profileSkinParts = [
  "about",
  "account",
  "actions",
  "bio",
  "bio-content",
  "blog-preview",
  "brand",
  "comment",
  "content",
  "custom-html",
  "details",
  "footer",
  "friends",
  "header",
  "identity",
  "interests",
  "links",
  "main",
  "name",
  "navigation",
  "navigation-links",
  "navigation-top",
  "notice",
  "page",
  "photo",
  "post",
  "sidebar",
  "search",
  "shell",
  "theme-song",
  "url",
  "vibe",
  "wall"
] as const;

export type ProfileSkinPart = (typeof profileSkinParts)[number];

export const profileSkinPartSet = new Set<string>(profileSkinParts);
