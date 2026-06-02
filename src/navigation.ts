import { messagesPath } from "./paths.js";

export const pageLinks = {
  about: { label: "About", href: "/about" },
  adminUsers: { label: "User list", href: "/admin/users" },
  blog: { label: "Blog", href: "/blog" },
  browse: { label: "Browse", href: "/browse" },
  favorites: { label: "Favs", href: "/favorites" },
  feed: { label: "Feed", href: "/feed" },
  groups: { label: "Groups", href: "/groups" },
  home: { label: "Home", href: "/" },
  messages: { label: "Messages", href: messagesPath },
  props: { label: "Props", href: "/props" },
  search: { label: "Search", href: "/search" },
  settings: { label: "Account settings", href: "/settings" },
  skins: { label: "Skins", href: "/skins" }
} as const;

export type PageLinkKey = keyof typeof pageLinks;

export const mainNavPageOrder = [
  "home",
  "feed",
  "messages",
  "groups",
  "browse",
  "search",
  "blog",
  "skins",
  "favorites",
  "props",
  "about"
] as const satisfies readonly PageLinkKey[];
