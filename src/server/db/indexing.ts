import { isBlogCategory, limits } from "../../policy.js";
import { blogPath, profilePath, skinPath } from "../../paths.js";
import { sqlite } from "./client.js";

const sitemapLimit = 50_000;

type HandleSitemapRow = { handle: string; lastmod: string };
type IdSitemapRow = { id: number; lastmod: string };
type CategoryRow = { category: string; lastmod: string };

export function publicProfileCanonicalPathByHandle(handle: string) {
  const row = sqlite
    .prepare(
      `SELECT p.handle
      FROM profiles p JOIN users u ON u.id = p.user_id
      WHERE p.handle = ? AND u.banned_at IS NULL AND p.private = 0`
    )
    .get(handle) as { handle: string } | undefined;
  return row ? profilePath(row.handle) : null;
}

export function publicBlogCanonicalPath(id: number) {
  const row = sqlite
    .prepare(
      `SELECT b.id
      FROM blogs b
      JOIN users u ON u.id = b.author_id
      JOIN profiles p ON p.user_id = u.id
      WHERE b.id = ? AND b.privacy_level = 0 AND u.banned_at IS NULL AND p.private = 0`
    )
    .get(id) as { id: number } | undefined;
  return row ? blogPath(row) : null;
}

export function publicSkinCanonicalPath(id: number) {
  const row = sqlite
    .prepare(
      `SELECT s.id
      FROM skins s
      LEFT JOIN users u ON u.id = s.author_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE s.id = ? AND (s.source_key IS NOT NULL OR (u.banned_at IS NULL AND p.private = 0))`
    )
    .get(id) as { id: number } | undefined;
  return row ? skinPath(row) : null;
}

export function publicProfileIndexPaths(limit = sitemapLimit) {
  const rows = sqlite
    .prepare(
      `SELECT p.handle, max(u.created_at, u.updated_at) AS lastmod
      FROM users u JOIN profiles p ON p.user_id = u.id
      WHERE u.banned_at IS NULL AND p.private = 0
      ORDER BY u.created_at DESC, u.id DESC LIMIT ?`
    )
    .all(limit) as HandleSitemapRow[];
  return rows.map((row) => ({ path: profilePath(row.handle), lastmod: row.lastmod }));
}

export function publicBlogIndexPaths(limit = sitemapLimit) {
  const rows = sqlite
    .prepare(
      `SELECT b.id, b.updated_at AS lastmod
      FROM blogs b
      JOIN users u ON u.id = b.author_id
      JOIN profiles p ON p.user_id = u.id
      WHERE b.privacy_level = 0 AND u.banned_at IS NULL AND p.private = 0
      ORDER BY b.created_at DESC, b.id DESC LIMIT ?`
    )
    .all(limit) as IdSitemapRow[];
  return rows.map((row) => ({ path: blogPath(row), lastmod: row.lastmod }));
}

export function publicSkinIndexPaths(limit = sitemapLimit) {
  const rows = sqlite
    .prepare(
      `SELECT s.id, s.updated_at AS lastmod
      FROM skins s
      LEFT JOIN users u ON u.id = s.author_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE s.source_key IS NOT NULL OR (u.banned_at IS NULL AND p.private = 0)
      ORDER BY s.updated_at DESC, s.id DESC LIMIT ?`
    )
    .all(limit) as IdSitemapRow[];
  return rows.map((row) => ({ path: skinPath(row), lastmod: row.lastmod }));
}

export function publicBlogCategoryIndexPaths(limit = limits.listPage) {
  return (
    sqlite
      .prepare(
        `SELECT b.category, max(b.updated_at) AS lastmod
        FROM blogs b
        JOIN users u ON u.id = b.author_id
        JOIN profiles p ON p.user_id = u.id
        WHERE b.privacy_level = 0 AND u.banned_at IS NULL AND p.private = 0
        GROUP BY b.category
        ORDER BY b.category ASC LIMIT ?`
      )
      .all(limit) as CategoryRow[]
  )
    .filter((row) => isBlogCategory(row.category))
    .map((row) => ({ path: `/blog/category/${encodeURIComponent(row.category)}`, lastmod: row.lastmod }));
}
