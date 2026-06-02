import { sqlite } from "./client.js";
import { rateLimits, type RateLimitAction } from "../../policy.js";
import type { RateLimitSetting } from "../../models.js";
import { recordFromUnknown } from "../../values.js";
import { deleteSetting, saveSetting, settingRow } from "./settings.js";

type ConsumeRateLimitInput = {
  action: string;
  subjectHash: string;
  limit: number;
  pruneAfterSeconds: number;
  windowSeconds: number;
};

type StoredRateLimitSetting = {
  action: RateLimitAction;
  limit: number;
  windowSeconds: number;
};

const raidModeSnapshotKey = "rate_limits.raid_mode_snapshot.v1";

export function consumeRateLimit(input: ConsumeRateLimitInput) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = nowSeconds - (nowSeconds % Math.max(1, Math.floor(input.windowSeconds)));
  const pruneBefore = nowSeconds - Math.max(1, Math.floor(input.pruneAfterSeconds));

  return sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM rate_limit_counters WHERE window_start < ?").run(pruneBefore);

    const row = sqlite
      .prepare("SELECT count FROM rate_limit_counters WHERE action = ? AND subject_hash = ? AND window_start = ?")
      .get(input.action, input.subjectHash, windowStart) as { count: number } | undefined;

    if ((row?.count ?? 0) >= input.limit) return false;

    sqlite
      .prepare(
        `INSERT INTO rate_limit_counters (action, subject_hash, window_start, count) VALUES (?, ?, ?, 1)
        ON CONFLICT(action, subject_hash, window_start)
        DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP`
      )
      .run(input.action, input.subjectHash, windowStart);
    return true;
  })();
}

export function rateLimitPolicyFor(action: RateLimitAction) {
  const setting = sqlite
    .prepare("SELECT limit_count AS limitValue, window_seconds AS windowSeconds FROM rate_limit_settings WHERE action = ?")
    .get(action) as { limitValue: number; windowSeconds: number } | undefined;
  return setting ? { limit: setting.limitValue, windowSeconds: setting.windowSeconds } : rateLimits.actions[action];
}

export function listRateLimitSettings() {
  const rows = sqlite
    .prepare("SELECT action, limit_count AS limitValue, window_seconds AS windowSeconds, updated_at AS updatedAt FROM rate_limit_settings")
    .all() as Array<{ action: string; limitValue: number; windowSeconds: number; updatedAt: string }>;
  const overrides = new Map(rows.map((row) => [row.action, row]));

  return rateLimitActionNames.map((action) => {
    const defaults = rateLimits.actions[action];
    const override = overrides.get(action);
    return {
      action,
      limit: override?.limitValue ?? defaults.limit,
      windowSeconds: override?.windowSeconds ?? defaults.windowSeconds,
      defaultLimit: defaults.limit,
      defaultWindowSeconds: defaults.windowSeconds,
      overridden: Boolean(override),
      updatedAt: override?.updatedAt ?? null
    } satisfies RateLimitSetting;
  });
}

export function saveRateLimitSettings(settings: Array<Pick<RateLimitSetting, "action" | "limit" | "windowSeconds">>, actorId: number) {
  sqlite.transaction(() => {
    const statement = sqlite.prepare(
      `INSERT INTO rate_limit_settings (action, limit_count, window_seconds, updated_by, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(action)
      DO UPDATE SET limit_count = excluded.limit_count,
        window_seconds = excluded.window_seconds,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP`
    );

    for (const setting of settings) {
      statement.run(setting.action, setting.limit, setting.windowSeconds, actorId);
    }
  })();
}

export function enableRaidMode(actorId: number) {
  if (!raidModeActive()) saveRaidModeSnapshot(currentRaidModeOverrides());
  saveRateLimitSettings(
    raidModeActionNames.map((action) => ({
      action,
      limit: 0,
      windowSeconds: rateLimitPolicyFor(action).windowSeconds
    })),
    actorId
  );
}

export function disableRaidMode() {
  const snapshot = readRaidModeSnapshot();
  const placeholders = raidModeActionNames.map(() => "?").join(", ");
  sqlite.transaction(() => {
    if (snapshot) {
      sqlite.prepare(`DELETE FROM rate_limit_settings WHERE action IN (${placeholders})`).run(...raidModeActionNames);
      const restore = sqlite.prepare(
        `INSERT INTO rate_limit_settings (action, limit_count, window_seconds, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
      );
      for (const setting of snapshot) restore.run(setting.action, setting.limit, setting.windowSeconds);
    } else {
      sqlite.prepare(`DELETE FROM rate_limit_settings WHERE action IN (${placeholders}) AND limit_count = 0`).run(...raidModeActionNames);
    }
    deleteSetting(raidModeSnapshotKey);
  })();
}

export function raidModeActive() {
  const placeholders = raidModeActionNames.map(() => "?").join(", ");
  const row = sqlite
    .prepare(`SELECT COUNT(*) AS count FROM rate_limit_settings WHERE action IN (${placeholders}) AND limit_count = 0`)
    .get(...raidModeActionNames) as { count: number };
  return row.count === raidModeActionNames.length;
}

export function resetRateLimitSettings() {
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM rate_limit_settings").run();
    deleteSetting(raidModeSnapshotKey);
  })();
}

export const rateLimitActionNames = Object.keys(rateLimits.actions).filter(rateLimitAction);
const raidModeActionNames = rateLimitActionNames.filter((action) => action !== "auth.login" && action !== "auth.reset" && action !== "staff.write");
const raidModeActions = new Set<RateLimitAction>(raidModeActionNames);

function currentRaidModeOverrides() {
  const placeholders = raidModeActionNames.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(
      `SELECT action, limit_count AS limitValue, window_seconds AS windowSeconds
      FROM rate_limit_settings WHERE action IN (${placeholders})`
    )
    .all(...raidModeActionNames) as Array<{ action: RateLimitAction; limitValue: number; windowSeconds: number }>;
  return rows.map((row) => ({
    action: row.action,
    limit: row.limitValue,
    windowSeconds: row.windowSeconds
  }));
}

function saveRaidModeSnapshot(settings: StoredRateLimitSetting[]) {
  saveSetting(raidModeSnapshotKey, JSON.stringify(settings));
}

function readRaidModeSnapshot() {
  const row = settingRow(raidModeSnapshotKey);
  if (!row) return null;
  try {
    return raidModeSnapshot(JSON.parse(row.value));
  } catch {
    return null;
  }
}

function raidModeSnapshot(value: unknown) {
  if (!Array.isArray(value)) return null;

  const seen = new Set<RateLimitAction>();
  const settings: StoredRateLimitSetting[] = [];
  for (const item of value) {
    const setting = raidModeSnapshotSetting(item);
    if (!setting || seen.has(setting.action)) return null;
    seen.add(setting.action);
    settings.push(setting);
  }
  return settings;
}

function raidModeSnapshotSetting(value: unknown): StoredRateLimitSetting | null {
  const { action, limit, windowSeconds } = recordFromUnknown(value);
  if (!rateLimitAction(action) || !raidModeActions.has(action)) return null;
  if (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 0) return null;
  if (typeof windowSeconds !== "number" || !Number.isSafeInteger(windowSeconds) || windowSeconds < 1) return null;
  return { action, limit, windowSeconds };
}

function rateLimitAction(value: unknown): value is RateLimitAction {
  return typeof value === "string" && value in rateLimits.actions;
}
