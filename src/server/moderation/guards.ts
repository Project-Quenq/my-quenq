import { getCurrentUser } from "../db/users.js";
import { canModerateTarget } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";

export function canModerateAuthor(actor: CurrentUser, authorId: number | null | undefined) {
  if (!authorId) return false;
  const target = getCurrentUser(authorId);
  return Boolean(target && canModerateTarget(actor, target));
}

export function canDeleteAsOwnerOrModerator(actor: CurrentUser, authorId: number | null | undefined, ownerIds: Array<number | null | undefined>) {
  return ownerIds.some((id) => id === actor.id) || canModerateAuthor(actor, authorId);
}
