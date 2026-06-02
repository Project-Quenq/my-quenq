import { addComment, commentRowsFrom, commentsFor, deleteComment } from "../comments.js";
import { limits } from "../../../policy.js";
import type { CurrentUser } from "../../../currentUser.js";

export function postCommentsFor(postId: number, viewer: CurrentUser | null = null, limit?: number) {
  return commentsFor("post", postId, { viewer, limit, order: "oldest" });
}

export function addPostComment(postId: number, authorId: number, textHtml: string, parentId?: number, viewer: CurrentUser | null = null): number | null {
  return addComment("post", postId, authorId, textHtml, parentId, viewer);
}

export function deletePostComment(commentId: number, actorId: number, isAdmin = false) {
  return deleteComment("post", commentId, actorId, isAdmin);
}

export function postCommentsByUser(userId: number, limit = limits.exportRows) {
  return commentRowsFrom(
    "post_comments",
    `WHERE c.author_id = ?
      ORDER BY c.created_at DESC LIMIT ?`,
    userId,
    limit
  );
}
