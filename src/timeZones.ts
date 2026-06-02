export const defaultTimeZone = "UTC";

const fallbackTimeZones = [
  "Africa/Cairo",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/New_York",
  "America/Phoenix",
  "America/Toronto",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Pacific/Auckland"
] as const;

let supportedCache: string[] | undefined;
type IntlWithTimeZones = typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };

export function supportedTimeZones() {
  if (supportedCache) return supportedCache;

  const zones = (Intl as IntlWithTimeZones).supportedValuesOf?.("timeZone") ?? [...fallbackTimeZones];
  supportedCache = [defaultTimeZone, ...zones.filter((zone) => zone !== defaultTimeZone)];
  return supportedCache;
}

export function isSupportedTimeZone(value: string) {
  return supportedTimeZones().includes(value);
}

export function normalizeTimeZone(value: unknown) {
  return typeof value === "string" && isSupportedTimeZone(value) ? value : defaultTimeZone;
}

export function timeZoneOptionLabel(timeZone: string) {
  return timeZone === defaultTimeZone ? defaultTimeZone : timeZone.replaceAll("_", " ");
}
