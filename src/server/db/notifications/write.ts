import type {
  NotificationContextType,
  NotificationKind,
  NotificationPreferenceType,
  NotificationSubjectType
} from "../../../notifications.js";
import { sqlite } from "../client.js";
import { isBlockedBetween } from "../relationships.js";
import { notificationPreferenceEnabled } from "./preferences.js";

type NotificationInput = {
  actorId: number;
  contextId: number;
  contextType: NotificationContextType;
  kind: NotificationKind;
  subjectId: number;
  subjectType: NotificationSubjectType;
};

export type NotificationTargetInput = NotificationInput & {
  preferenceType?: NotificationPreferenceType;
  recipientId: number | null | undefined;
};

export function createNotification(input: NotificationTargetInput) {
  if (!input.recipientId || input.recipientId === input.actorId || isBlockedBetween(input.recipientId, input.actorId)) return false;
  if (input.preferenceType && !notificationPreferenceEnabled(input.recipientId, input.preferenceType)) return false;
  return sqlite
    .prepare(
      `INSERT INTO notifications (
        recipient_id, actor_id, kind, subject_type, subject_id, context_type, context_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(input.recipientId, input.actorId, input.kind, input.subjectType, input.subjectId, input.contextType, input.contextId)
    .changes > 0;
}

export function createNotifications(inputs: readonly NotificationTargetInput[]) {
  if (!inputs.length) return false;
  return sqlite.transaction(() => {
    let created = false;
    for (const input of inputs) {
      if (createNotification(input)) created = true;
    }
    return created;
  })();
}
