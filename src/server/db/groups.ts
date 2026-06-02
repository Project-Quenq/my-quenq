import { sqlite } from "./client.js";
import { limits, systemIds } from "../../policy.js";
import type { GroupItem, GroupMember } from "../../models.js";
import { containsLikePattern, likeEscapeClause } from "./like.js";
import { profileVisibilitySql } from "./profileVisibility.js";
import { canBypassVisibility } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";

const groupColumns = (memberVisibilitySql: string) => `g.id, g.name, g.description_html AS descriptionHtml, g.created_at AS createdAt,
  u.id AS ownerId, u.role AS ownerRole, p.handle AS ownerHandle, u.username AS ownerName,
  COUNT(CASE WHEN ${memberVisibilitySql} THEN active_member.id END) AS memberCount`;

const groupSelect = (memberVisibilitySql: string) => `SELECT ${groupColumns(memberVisibilitySql)}
  FROM groups g
  JOIN users u ON u.id = g.owner_id
  JOIN profiles p ON p.user_id = u.id
  LEFT JOIN group_members m ON m.group_id = g.id
  LEFT JOIN users active_member ON active_member.id = m.user_id
  LEFT JOIN profiles active_member_profile ON active_member_profile.user_id = active_member.id`;

export function listGroups(viewer: CurrentUser | null = null, limit = limits.listPage) {
  const visible = profileVisibilitySql(viewer);
  return groupRows(viewer, `WHERE ${visible.sql} GROUP BY g.id ORDER BY memberCount DESC, g.created_at DESC, g.id DESC LIMIT ?`, ...visible.params, limit);
}

export function searchGroups(query: string, viewer: CurrentUser | null = null, limit = limits.listPage) {
  const pattern = containsLikePattern(query);
  const visible = profileVisibilitySql(viewer);
  return groupRows(
    viewer,
    `WHERE ${visible.sql} AND (g.name LIKE ? ${likeEscapeClause} OR g.description_html LIKE ? ${likeEscapeClause})
    GROUP BY g.id ORDER BY g.created_at DESC LIMIT ?`,
    ...visible.params,
    pattern,
    pattern,
    limit
  );
}

export function featuredCommunityGroups(limit = limits.newestCommunities) {
  return sqlite
    .prepare(
      `${groupSelect("active_member.banned_at IS NULL")}
      WHERE u.banned_at IS NULL
      GROUP BY g.id
      ORDER BY CASE WHEN g.id = ? THEN 0 ELSE 1 END, memberCount DESC, g.created_at DESC
      LIMIT ?`
    )
    .all(systemIds.defaultGroupId, limit) as GroupItem[];
}

export function getGroup(id: number) {
  return groupRows(null, "WHERE g.id = ? AND u.banned_at IS NULL GROUP BY g.id", id)[0];
}

export function createGroup(ownerId: number, name: string, descriptionHtml: string) {
  const create = sqlite.transaction(() => {
    const info = sqlite.prepare("INSERT INTO groups (owner_id, name, description_html) VALUES (?, ?, ?)").run(ownerId, name, descriptionHtml);
    const groupId = Number(info.lastInsertRowid);
    sqlite.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')").run(groupId, ownerId);
    sqlite.prepare("UPDATE profiles SET current_group_id = ? WHERE user_id = ?").run(groupId, ownerId);
    return groupId;
  });
  const groupId = create();
  if (isDefaultGroup(groupId)) ensureDefaultGroupMemberships();
  return groupId;
}

export function joinGroup(groupId: number, userId: number) {
  const join = sqlite.transaction(() => {
    sqlite.prepare("INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)").run(groupId, userId);
    sqlite.prepare("UPDATE profiles SET current_group_id = ? WHERE user_id = ?").run(groupId, userId);
  });
  join();
}

export function leaveGroup(groupId: number, userId: number) {
  if (isDefaultGroup(groupId)) {
    ensureDefaultGroupMembership(userId);
    return false;
  }
  const leave = sqlite.transaction(() => {
    const info = sqlite.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND role <> 'owner'").run(groupId, userId);
    if (info.changes > 0) {
      sqlite.prepare("UPDATE profiles SET current_group_id = NULL WHERE user_id = ? AND current_group_id = ?").run(userId, groupId);
    }
    return info.changes > 0;
  });
  return leave();
}

export function updateGroup(ownerId: number, groupId: number, name: string, descriptionHtml: string) {
  const info = sqlite
    .prepare("UPDATE groups SET name = ?, description_html = ? WHERE id = ? AND owner_id = ?")
    .run(name, descriptionHtml, groupId, ownerId);
  return info.changes > 0;
}

export function deleteGroup(groupId: number, actorId: number, isAdmin = false) {
  if (isDefaultGroup(groupId)) return false;
  const remove = sqlite.transaction(() => {
    const info = isAdmin
      ? sqlite.prepare("DELETE FROM groups WHERE id = ?").run(groupId)
      : sqlite.prepare("DELETE FROM groups WHERE id = ? AND owner_id = ?").run(groupId, actorId);
    if (info.changes > 0) {
      sqlite.prepare("UPDATE profiles SET current_group_id = NULL WHERE current_group_id = ?").run(groupId);
    }
    return info.changes > 0;
  });
  return remove();
}

export function groupMembers(groupId: number, viewer: CurrentUser | null = null, limit = limits.listPage) {
  if (!canViewGroup(viewer, groupId)) return [];
  const visible = profileVisibilitySql(viewer);
  return sqlite
    .prepare(
      `SELECT u.id, u.username, p.handle, p.pfp, gm.role, gm.created_at AS joinedAt
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE gm.group_id = ? AND ${visible.sql}
      ORDER BY gm.role = 'owner' DESC, gm.created_at ASC LIMIT ?`
    )
    .all(groupId, ...visible.params, limit) as GroupMember[];
}

export function isGroupMember(groupId: number, userId: number) {
  return Boolean(sqlite.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, userId));
}

export function canViewGroup(viewer: CurrentUser | null, groupId: number) {
  if (!viewer) return false;
  const visibleOwner = profileVisibilitySql(viewer);
  return Boolean(
    sqlite
      .prepare(
        `SELECT 1 FROM groups g
        JOIN users u ON u.id = g.owner_id
        JOIN profiles p ON p.user_id = u.id
        WHERE g.id = ? AND ${visibleOwner.sql}`
      )
      .get(groupId, ...visibleOwner.params)
  );
}

export function groupPostAccessSql(viewer: CurrentUser | null, groupAlias = "g") {
  if (!viewer) return { sql: "0 = 1", params: [] };
  if (canBypassVisibility(viewer)) return { sql: "1 = 1", params: [] };
  return {
    sql: `EXISTS (
      SELECT 1 FROM group_members access_member
      WHERE access_member.group_id = ${groupAlias}.id AND access_member.user_id = ?
    )`,
    params: [viewer.id]
  };
}

export function ownedGroupsForUser(userId: number, limit = limits.exportRows) {
  const viewer = exportViewer(userId);
  return groupRows(viewer, "WHERE g.owner_id = ? AND u.banned_at IS NULL GROUP BY g.id ORDER BY g.created_at DESC LIMIT ?", userId, limit);
}

export function joinedGroupsForUser(userId: number, limit = limits.exportRows) {
  const visible = profileVisibilitySql(exportViewer(userId), { user: "active_member", profile: "active_member_profile" });
  return sqlite
    .prepare(
      `SELECT ${groupColumns(visible.sql)}
      FROM group_members own_member
      JOIN groups g ON g.id = own_member.group_id
      JOIN users u ON u.id = g.owner_id
      JOIN profiles p ON p.user_id = u.id
      LEFT JOIN group_members all_members ON all_members.group_id = g.id
      LEFT JOIN users active_member ON active_member.id = all_members.user_id
      LEFT JOIN profiles active_member_profile ON active_member_profile.user_id = active_member.id
      WHERE own_member.user_id = ? AND u.banned_at IS NULL
      GROUP BY g.id
      ORDER BY own_member.created_at DESC LIMIT ?`
    )
    .all(...visible.params, userId, limit) as GroupItem[];
}

function isDefaultGroup(groupId: number) {
  return groupId === systemIds.defaultGroupId;
}

export function ensureDefaultGroupMembership(userId: number) {
  sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO group_members (group_id, user_id, role)
        SELECT g.id, u.id, CASE WHEN g.owner_id = u.id THEN 'owner' ELSE 'member' END
        FROM groups g JOIN users u ON u.id = ?
        WHERE g.id = ?`
      )
      .run(userId, systemIds.defaultGroupId);
    ensureDefaultGroupOwnerRole();
  })();
}

export function ensureDefaultGroupMemberships() {
  sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO group_members (group_id, user_id, role)
        SELECT g.id, u.id, CASE WHEN g.owner_id = u.id THEN 'owner' ELSE 'member' END
        FROM groups g CROSS JOIN users u
        WHERE g.id = ?`
      )
      .run(systemIds.defaultGroupId);
    ensureDefaultGroupOwnerRole();
  })();
}

function groupRows(viewer: CurrentUser | null, tail: string, ...params: unknown[]) {
  const visibleMembers = profileVisibilitySql(viewer, { user: "active_member", profile: "active_member_profile" });
  return sqlite.prepare(`${groupSelect(visibleMembers.sql)} ${tail}`).all(...visibleMembers.params, ...params) as GroupItem[];
}

function ensureDefaultGroupOwnerRole() {
  sqlite
    .prepare(
      `UPDATE group_members SET role = 'owner'
      WHERE group_id = ? AND user_id = (SELECT owner_id FROM groups WHERE id = ?)`
    )
    .run(systemIds.defaultGroupId, systemIds.defaultGroupId);
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
