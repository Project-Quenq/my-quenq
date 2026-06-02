import { limits, type BlogCategory } from "../../../policy.js";
import type { CurrentUser } from "../../../currentUser.js";
import { blogRows, blogPreviewRows } from "./sql.js";
import { blogVisibilitySql } from "./visibility.js";
import { profileVisibilitySql } from "../profileVisibility.js";
import { containsLikePattern, likeEscapeClause } from "../like.js";

const blogDiscoveryOrder = `ORDER BY b.pinned DESC, (propsCount + commentCount) DESC, propsCount DESC, commentCount DESC, b.created_at DESC, b.id DESC`;
const blogLatestOrder = "ORDER BY b.pinned DESC, b.created_at DESC, b.id DESC";
type BlogListOrder = "latest" | "engagement";

export function blogsForUser(userId: number, viewer: CurrentUser | null, limit = limits.profileBlogPreview, order: BlogListOrder = "latest") {
  const visibility = blogVisibilitySql(viewer);
  const orderBy = order === "engagement" ? blogDiscoveryOrder : blogLatestOrder;
  return blogPreviewRows(
    `WHERE b.author_id = ? AND ${visibility.sql}
    ${orderBy} LIMIT ?`,
    viewer,
    userId,
    ...visibility.params,
    limit
  );
}

export function allBlogsForUser(userId: number, limit = limits.exportRows) {
  return blogPreviewRows("WHERE b.author_id = ? ORDER BY b.pinned DESC, b.created_at DESC LIMIT ?", exportViewer(userId), userId, limit);
}

export function allBlogs(viewer: CurrentUser | null, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  const visibility = blogVisibilitySql(viewer);
  return blogRows(
    `WHERE ${visible.sql} AND ${visibility.sql}
    ${blogDiscoveryOrder} LIMIT ?`,
    viewer,
    ...visible.params,
    ...visibility.params,
    limit
  );
}

export function blogsByCategory(category: BlogCategory, viewer: CurrentUser | null, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  const visibility = blogVisibilitySql(viewer);
  return blogRows(
    `WHERE b.category = ? AND ${visible.sql} AND ${visibility.sql}
    ${blogDiscoveryOrder} LIMIT ?`,
    viewer,
    category,
    ...visible.params,
    ...visibility.params,
    limit
  );
}

export function getBlog(id: number, viewer: CurrentUser | null = null) {
  return blogRows("WHERE b.id = ? LIMIT 1", viewer, id)[0];
}

export function proppedBlogsForUser(userId: number, limit = limits.exportRows) {
  const viewer = exportViewer(userId);
  return blogRows(
    `WHERE b.id IN (SELECT p.blog_id FROM blog_props p WHERE p.user_id = ?)
    ORDER BY b.created_at DESC, b.id DESC LIMIT ?`,
    viewer,
    userId,
    limit
  );
}

export function proppedBlogsForViewer(viewer: CurrentUser, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  const visibility = blogVisibilitySql(viewer);
  return blogRows(
    `JOIN blog_props viewer_prop ON viewer_prop.blog_id = b.id AND viewer_prop.user_id = ?
    WHERE ${visible.sql} AND ${visibility.sql}
    ORDER BY viewer_prop.created_at DESC, b.id DESC LIMIT ?`,
    viewer,
    viewer.id,
    ...visible.params,
    ...visibility.params,
    limit
  );
}

export function searchBlogs(query: string, viewer: CurrentUser | null, limit = limits.listPage) {
  const pattern = containsLikePattern(query);
  const visible = profileVisibilitySql(viewer);
  const visibility = blogVisibilitySql(viewer);
  return {
    blogs: blogRows(
      `WHERE ${visible.sql} AND ${visibility.sql} AND (b.title LIKE ? ${likeEscapeClause} OR b.body_html LIKE ? ${likeEscapeClause})
      ORDER BY b.created_at DESC LIMIT ?`,
      viewer,
      ...visible.params,
      ...visibility.params,
      pattern,
      pattern,
      limit
    )
  };
}

function exportViewer(userId: number): CurrentUser {
  return {
    id: userId,
    username: "",
    email: "",
    role: "user",
    timeZone: "UTC",
    verifiedAt: null,
    bannedAt: null
  };
}
