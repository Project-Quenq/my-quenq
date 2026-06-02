import { sqlite } from "../client.js";

export function postImageFilenamesForGroup(groupId: number) {
  return postImageRows("group_id = ?", groupId);
}

export function postImageFilenamesForAccount(userId: number) {
  return postImageRows(
    "author_id = ? OR wall_user_id = ? OR group_id IN (SELECT id FROM groups WHERE owner_id = ?)",
    userId,
    userId,
    userId
  );
}

export function postIdsForImage(filename: string) {
  const rows = sqlite
    .prepare("SELECT id FROM posts WHERE media_filename = ? ORDER BY id DESC")
    .all(filename) as { id: number }[];
  return rows.map((row) => row.id);
}

function postImageRows(whereSql: string, ...params: unknown[]) {
  const rows = sqlite
    .prepare(`SELECT DISTINCT media_filename AS filename FROM posts WHERE (${whereSql}) AND media_filename IS NOT NULL`)
    .all(...params) as { filename: string }[];
  return rows.map((row) => row.filename);
}
