import {
  publicBlogCategoryIndexPaths,
  publicBlogIndexPaths,
  publicProfileIndexPaths,
  publicSkinIndexPaths
} from "../db/indexing.js";
import { siteSettings } from "../db/siteSettings.js";
import { staticContentPaths } from "./routes.js";
import { absoluteUrl, xmlEscape } from "./urls.js";

const sitemapUrlLimit = 50_000;
type SitemapPath = { path: string; lastmod?: string | null };

export function sitemapXml() {
  const paths = sitemapPaths();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => sitemapUrlXml(path)),
    "</urlset>",
    ""
  ].join("\n");
}

function sitemapPaths() {
  const paths: SitemapPath[] = [];
  const seen = new Set<string>();
  addSitemapPaths(paths, seen, staticSitemapPaths());
  addSitemapPaths(paths, seen, publicBlogCategoryIndexPaths(remainingSitemapSlots(paths)));
  addSitemapPaths(paths, seen, publicProfileIndexPaths(remainingSitemapSlots(paths)));
  addSitemapPaths(paths, seen, publicBlogIndexPaths(remainingSitemapSlots(paths)));
  addSitemapPaths(paths, seen, publicSkinIndexPaths(remainingSitemapSlots(paths)));
  return paths;
}

function staticSitemapPaths(): SitemapPath[] {
  const lastmod = siteSettings().updatedAt;
  return staticContentPaths.map((path) => ({ path, lastmod }));
}

function addSitemapPaths(paths: SitemapPath[], seen: Set<string>, nextPaths: readonly SitemapPath[]) {
  for (const row of nextPaths) {
    if (paths.length >= sitemapUrlLimit) return;
    if (seen.has(row.path)) continue;
    seen.add(row.path);
    paths.push(row);
  }
}

function remainingSitemapSlots(paths: readonly SitemapPath[]) {
  return Math.max(sitemapUrlLimit - paths.length, 0);
}

function sitemapUrlXml(row: SitemapPath) {
  const lastmod = sitemapLastmod(row.lastmod);
  return lastmod
    ? `  <url><loc>${xmlEscape(absoluteUrl(row.path))}</loc><lastmod>${xmlEscape(lastmod)}</lastmod></url>`
    : `  <url><loc>${xmlEscape(absoluteUrl(row.path))}</loc></url>`;
}

function sitemapLastmod(value: string | null | undefined) {
  if (!value) return null;
  const candidate = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
