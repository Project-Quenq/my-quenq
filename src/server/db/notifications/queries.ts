import {
  decodeKeysetCursor,
  keysetBeforeCondition,
  normalizePageLimit,
  pageFromRows,
  type PageOptions
} from "../../pagination.js";
import { limits } from "../../../policy.js";
import type { CurrentUser } from "../../../currentUser.js";
import { sqlite } from "../client.js";
import { notificationFrom, notificationRows, visibleNotificationParams, visibleNotificationSql } from "./sql.js";

export function unreadNotificationCount(userId: number) {
  return (
    sqlite
      .prepare(
        `SELECT COUNT(*) AS count ${notificationFrom}
        WHERE ${visibleNotificationSql} AND n.read_at IS NULL`
      )
      .get(...visibleNotificationParams(userId)) as { count: number }
  ).count;
}

export function notificationsForUser(viewer: CurrentUser, options: PageOptions = {}) {
  const limit = normalizePageLimit(options.limit, limits.listPage, limits.exportRows);
  const before = keysetBeforeCondition(decodeKeysetCursor(options.before), "n.created_at", "n.id");
  return pageFromRows(
    notificationRows(
      `WHERE ${visibleNotificationSql}
      ${before.sql}
      ORDER BY n.created_at DESC, n.id DESC LIMIT ?`,
      ...visibleNotificationParams(viewer.id),
      ...before.params,
      limit + 1
    ),
    limit
  );
}
