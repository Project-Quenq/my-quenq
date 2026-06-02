import { addComment, commentsFor, deleteComment } from "../comments.js";
import type { CurrentUser } from "../../../currentUser.js";

export function blogCommentsFor(blogId: number, viewer: CurrentUser | null = null, limit?: number) {
  return commentsFor("blog", blogId, { viewer, limit });
}

export function addBlogComment(blogId: number, authorId: number, textHtml: string, parentId?: number, viewer: CurrentUser | null = null): number | null {
  return addComment("blog", blogId, authorId, textHtml, parentId, viewer);
}

export function deleteBlogComment(commentId: number, actorId: number, isAdmin = false) {
  return deleteComment("blog", commentId, actorId, isAdmin);
}
