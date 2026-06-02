import { friendshipStatus } from "../../../policy.js";
import { canBypassVisibility } from "../../../roles.js";
import type { CurrentUser } from "../../../currentUser.js";
import { sqlite } from "../client.js";
import type { BlogItem } from "../../../models.js";

export function canViewBlog(viewer: CurrentUser | null, blog: BlogItem) {
  if (blog.privacyLevel === 0 || canBypassVisibility(viewer)) return true;
  if (!viewer) return false;
  if (viewer.id === blog.authorId) return true;
  if (blog.privacyLevel === 1) {
    return Boolean(
      sqlite
        .prepare(
          `SELECT 1 FROM friendships
          WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = ?
          LIMIT 1`
        )
        .get(viewer.id, blog.authorId, blog.authorId, viewer.id, friendshipStatus.accepted)
    );
  }
  return false;
}

export function blogVisibilitySql(viewer: CurrentUser | null): { sql: string; params: unknown[] } {
  if (!viewer) return { sql: "b.privacy_level = 0", params: [] };
  if (canBypassVisibility(viewer)) return { sql: "1 = 1", params: [] };
  return {
    sql: `(b.privacy_level = 0 OR b.author_id = ? OR (
      b.privacy_level = 1 AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE ((f.sender_id = ? AND f.receiver_id = b.author_id) OR (f.receiver_id = ? AND f.sender_id = b.author_id))
        AND f.status = ?
      )
    ))`,
    params: [viewer.id, viewer.id, viewer.id, friendshipStatus.accepted]
  };
}
