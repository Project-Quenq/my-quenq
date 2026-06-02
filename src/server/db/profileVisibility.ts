import { friendshipStatus } from "../../policy.js";
import { canBypassVisibility } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";

type ProfileVisibilityAliases = {
  profile?: string;
  user?: string;
};

export function profileVisibilitySql(viewer: CurrentUser | null, aliases: ProfileVisibilityAliases = {}) {
  const viewerId = viewer?.id ?? 0;
  const bypass = canBypassVisibility(viewer) ? 1 : 0;
  const user = aliases.user ?? "u";
  const profile = aliases.profile ?? "p";
  return {
    sql: `${user}.banned_at IS NULL AND (
      ${profile}.private = 0 OR ${user}.id = ? OR ? = 1 OR EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = ?
          AND ((f.sender_id = ? AND f.receiver_id = ${user}.id) OR (f.receiver_id = ? AND f.sender_id = ${user}.id))
      )
    ) AND (
      ${user}.id = ? OR ? = 1 OR NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE (b.blocker_id = ? AND b.blocked_id = ${user}.id) OR (b.blocked_id = ? AND b.blocker_id = ${user}.id)
      )
    )`,
    params: [viewerId, bypass, friendshipStatus.accepted, viewerId, viewerId, viewerId, bypass, viewerId, viewerId]
  };
}
