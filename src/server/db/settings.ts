import { sqlite } from "./client.js";

type SettingRow = {
  value: string;
  updatedAt: string;
};

export function settingRow(key: string) {
  return sqlite
    .prepare("SELECT value, updated_at AS updatedAt FROM app_settings WHERE key = ?")
    .get(key) as SettingRow | undefined;
}

export function settingExists(key: string) {
  return Boolean(sqlite.prepare("SELECT 1 FROM app_settings WHERE key = ?").get(key));
}

export function saveSetting(key: string, value: string) {
  sqlite
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    )
    .run(key, value);
}

export function deleteSetting(key: string) {
  sqlite.prepare("DELETE FROM app_settings WHERE key = ?").run(key);
}
