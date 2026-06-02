import {
  notificationPreferenceTypeNames,
  type NotificationPreferences,
  type NotificationPreferenceType
} from "../../../notifications.js";
import { sqlite } from "../client.js";

export function defaultNotificationPreferences(): NotificationPreferences {
  return Object.fromEntries(notificationPreferenceTypeNames.map((type) => [type, true])) as NotificationPreferences;
}

export function notificationPreferencesForUser(userId: number) {
  const preferences = defaultNotificationPreferences();
  const rows = sqlite
    .prepare("SELECT type, enabled FROM notification_preferences WHERE user_id = ?")
    .all(userId) as Array<{ type: string; enabled: 0 | 1 }>;
  for (const row of rows) {
    if (isNotificationPreferenceType(row.type)) preferences[row.type] = Boolean(row.enabled);
  }
  return preferences;
}

export function updateNotificationPreferences(userId: number, preferences: NotificationPreferences) {
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM notification_preferences WHERE user_id = ?").run(userId);
    const insert = sqlite.prepare("INSERT INTO notification_preferences (user_id, type, enabled) VALUES (?, ?, 0)");
    for (const type of notificationPreferenceTypeNames) {
      if (!preferences[type]) insert.run(userId, type);
    }
  })();
}

export function notificationPreferenceEnabled(userId: number, type: NotificationPreferenceType) {
  const row = sqlite
    .prepare("SELECT enabled FROM notification_preferences WHERE user_id = ? AND type = ?")
    .get(userId, type) as { enabled: 0 | 1 } | undefined;
  return row ? Boolean(row.enabled) : true;
}

function isNotificationPreferenceType(type: string): type is NotificationPreferenceType {
  return notificationPreferenceTypeNames.includes(type as NotificationPreferenceType);
}
