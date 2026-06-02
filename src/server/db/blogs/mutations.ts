import { defaultBlogCategory, type BlogCategory } from "../../../policy.js";
import { sqlite } from "../client.js";

export function createBlog(authorId: number, title: string, bodyHtml: string, category: BlogCategory = defaultBlogCategory, privacyLevel = 0, commentsEnabled = true) {
  const info = sqlite
    .prepare("INSERT INTO blogs (author_id, title, body_html, category, privacy_level, comments_enabled) VALUES (?, ?, ?, ?, ?, ?)")
    .run(authorId, title, bodyHtml, category, privacyLevel, commentsEnabled ? 1 : 0);
  return Number(info.lastInsertRowid);
}

export function updateBlog(
  authorId: number,
  blogId: number,
  title: string,
  bodyHtml: string,
  category: BlogCategory = defaultBlogCategory,
  privacyLevel = 0,
  commentsEnabled = true,
  pinned = false
) {
  const info = sqlite
    .prepare(
      `UPDATE blogs SET title = ?, body_html = ?, category = ?, privacy_level = ?, comments_enabled = ?,
        pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND author_id = ?`
    )
    .run(title, bodyHtml, category, privacyLevel, commentsEnabled ? 1 : 0, pinned ? 1 : 0, blogId, authorId);
  return info.changes > 0;
}

export function deleteBlog(blogId: number, actorId: number, isAdmin = false) {
  const info = isAdmin
    ? sqlite.prepare("DELETE FROM blogs WHERE id = ?").run(blogId)
    : sqlite.prepare("DELETE FROM blogs WHERE id = ? AND author_id = ?").run(blogId, actorId);
  return info.changes > 0;
}

export function addBlogProp(blogId: number, userId: number) {
  return sqlite.prepare("INSERT OR IGNORE INTO blog_props (blog_id, user_id) VALUES (?, ?)").run(blogId, userId).changes > 0;
}

export function removeBlogProp(blogId: number, userId: number) {
  sqlite.prepare("DELETE FROM blog_props WHERE blog_id = ? AND user_id = ?").run(blogId, userId);
}
