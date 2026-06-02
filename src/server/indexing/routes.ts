import { isBlogCategory } from "../../policy.js";
import {
  publicBlogCanonicalPath,
  publicProfileCanonicalPathByHandle,
  publicSkinCanonicalPath
} from "../db/indexing.js";
import type { AppContext } from "../context.js";
import { decodeSegment, idRoute, normalizePath, routeSuffix } from "./urls.js";

type IndexingDecision =
  | { index: true; canonicalPath: string }
  | { index: false; reason: string };

export const noindexHeader = "noindex, nofollow, noarchive, noimageindex";

export const staticContentPaths = [
  "/",
  "/about",
  "/source",
  "/license",
  "/credits",
  "/contact",
  "/privacy",
  "/terms",
  "/help",
  "/rules",
  "/browse",
  "/blog",
  "/skins"
] as const;

const staticContentPathSet = new Set<string>(staticContentPaths);

export function resolveIndexing(c: AppContext): IndexingDecision {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") return noindex("non-GET request");
  if (c.get("currentUser")) return noindex("authenticated request");

  const url = new URL(c.req.url);
  if (url.search) return noindex("query string");

  return resolveIndexingPath(normalizePath(url.pathname));
}

function resolveIndexingPath(path: string): IndexingDecision {
  if (staticContentPathSet.has(path)) return index(path);

  const blogCategory = routeSuffix(path, "/blog/category/");
  if (blogCategory !== null) {
    const category = decodeSegment(blogCategory);
    return category && isBlogCategory(category) ? index(`/blog/category/${encodeURIComponent(category)}`) : noindex("unknown blog category");
  }

  const profile = profileRoute(path);
  if (profile) {
    const canonicalPath = publicProfileCanonicalPathByHandle(profile.handle);
    if (!canonicalPath) return noindex("non-public profile handle");
    return index(profile.suffix ? `${canonicalPath}${profile.suffix}` : canonicalPath);
  }

  const blog = idRoute(path, "/b/");
  if (blog) {
    if (!["", "/comments"].includes(blog.suffix)) return noindex("non-canonical blog route");
    const canonicalPath = publicBlogCanonicalPath(blog.id);
    if (!canonicalPath) return noindex("non-public blog");
    return index(canonicalPath);
  }

  const skin = idRoute(path, "/s/");
  if (skin) {
    if (!["", "/comments"].includes(skin.suffix)) return noindex("non-canonical skin route");
    const canonicalPath = publicSkinCanonicalPath(skin.id);
    if (!canonicalPath) return noindex("non-public skin");
    return index(canonicalPath);
  }

  return noindex("unregistered route");
}

function profileRoute(path: string) {
  if (!path.startsWith("/u/")) return null;
  const rest = path.slice("/u/".length);
  const [rawHandle, ...parts] = rest.split("/");
  const handle = decodeSegment(rawHandle)?.toLowerCase();
  if (!handle) return null;
  const suffix = parts.length ? `/${parts.join("/")}` : "";
  if (!["", "/blog", "/friends", "/wall"].includes(suffix)) return null;
  return { handle, suffix };
}

function index(canonicalPath: string): IndexingDecision {
  return { index: true, canonicalPath };
}

function noindex(reason: string): IndexingDecision {
  return { index: false, reason };
}
