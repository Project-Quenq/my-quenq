import { limits } from "../../policy.js";
import { allBlogsForUser, blogCommentsFor, proppedBlogsForUser } from "./blogs/index.js";
import { joinedGroupsForUser, ownedGroupsForUser } from "./groups.js";
import { skinCommentsFor, skinsForUser } from "./skins.js";
import { messagesForUser } from "./messages/index.js";
import { reportsFiledByUser } from "./moderation/index.js";
import { notificationPreferencesForUser, notificationsForUser } from "./notifications/index.js";
import {
  postCommentsByUser,
  postCommentsFor,
  postsAuthoredByUser,
  postsOnWallForUser,
  proppedPostsForUser
} from "./posts/index.js";
import { blockedUsers, favoriteUsers, friendsFor, pendingRequestsFor, sentRequestsFor } from "./relationships.js";
import { getCurrentUser, getProfile } from "./users.js";

export function exportAccountData(userId: number) {
  const limit = limits.exportRows;
  const viewer = getCurrentUser(userId) ?? null;
  return {
    profile: getProfile(userId),
    friends: friendsFor(userId, limit),
    receivedFriendRequests: pendingRequestsFor(userId, limit),
    sentFriendRequests: sentRequestsFor(userId, limit),
    favorites: favoriteUsers(userId, viewer, limit),
    blockedUsers: blockedUsers(userId, limit),
    postsAuthored: rowsWithComments(postsAuthoredByUser(userId, limit), (id) => postCommentsFor(id, viewer, limit)),
    postsOnWall: rowsWithComments(postsOnWallForUser(userId, limit), (id) => postCommentsFor(id, viewer, limit)),
    postComments: exportRows(postCommentsByUser(userId, limit)),
    proppedPosts: exportRows(proppedPostsForUser(userId, limit)),
    blogs: rowsWithComments(allBlogsForUser(userId, limit), (id) => blogCommentsFor(id, viewer, limit)),
    proppedBlogs: exportRows(proppedBlogsForUser(userId, limit)),
    groups: exportRows(ownedGroupsForUser(userId, limit)),
    joinedGroups: exportRows(joinedGroupsForUser(userId, limit)),
    messages: messagesForUser(userId, limit),
    notificationPreferences: notificationPreferencesForUser(userId),
    notifications: viewer ? notificationsForUser(viewer, { limit }).items : [],
    reportsFiled: reportsFiledByUser(userId, limit),
    skins: rowsWithComments(skinsForUser(userId, limit), (id) => skinCommentsFor(id, viewer, limit))
  };
}

function rowsWithComments<T extends { authorSkinHtml?: unknown; id: number; authorRole?: unknown; ownerRole?: unknown }>(
  rows: T[],
  commentsFor: (id: number) => Array<{ authorSkinHtml?: unknown; authorRole?: unknown; ownerRole?: unknown }>
) {
  return exportRows(rows).map((row) => ({
    ...row,
    comments: exportRows(commentsFor(row.id))
  }));
}

function exportRows<T extends { authorSkinHtml?: unknown; authorRole?: unknown; ownerRole?: unknown }>(rows: T[]) {
  return rows.map(({ authorRole: _authorRole, authorSkinHtml: _authorSkinHtml, ownerRole: _ownerRole, ...exported }) => exported);
}
