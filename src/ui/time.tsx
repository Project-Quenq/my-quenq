import { createContext, useContext } from "hono/jsx";
import { defaultTimeZone, normalizeTimeZone } from "../timeZones.js";
import type { ViewChild } from "./types.js";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const sqliteTimestampPattern = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;
const timezonePattern = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const timestampSeparator = "\u00b7";
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const TimeZoneContext = createContext(defaultTimeZone);

export function TimeZoneProvider(props: { children: ViewChild; timeZone?: string | null }) {
  return <TimeZoneContext.Provider value={normalizeTimeZone(props.timeZone)}>{props.children}</TimeZoneContext.Provider>;
}

export function LocalizedTime(props: { value: string }) {
  const datetime = normalizeTimestamp(props.value);
  const timeZone = currentDisplayTimeZone();

  return <time class="timestamp" datetime={datetime} title={formatTimestamp(datetime, props.value, defaultTimeZone)}>{formatTimestamp(datetime, props.value, timeZone)}</time>;
}

function normalizeTimestamp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const sqliteTimestamp = sqliteTimestampPattern.exec(trimmed);
  if (sqliteTimestamp) return `${sqliteTimestamp[1]}T${sqliteTimestamp[2]}Z`;
  if (dateOnlyPattern.test(trimmed)) return trimmed;
  if (trimmed.includes("T") && !timezonePattern.test(trimmed)) return `${trimmed}Z`;

  return trimmed;
}

function formatTimestamp(value: string, fallback = value, timeZone = defaultTimeZone) {
  const timestamp = normalizeTimestamp(value);

  if (dateOnlyPattern.test(timestamp)) {
    const [year, month, day] = timestamp.split("-").map(Number);
    if (validDateParts(year, month, day)) return `${monthNames[month - 1]} ${day}, ${year}`;
    return fallback;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return fallback;

  return formatDateTime(date, normalizeTimeZone(timeZone));
}

function validDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function currentDisplayTimeZone() {
  return normalizeTimeZone(useContext(TimeZoneContext));
}

function formatDateTime(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short"
  }).formatToParts(date);

  const month = part(parts, "month");
  const day = part(parts, "day");
  const year = part(parts, "year");
  const hour = part(parts, "hour");
  const minute = part(parts, "minute");
  const zoneName = part(parts, "timeZoneName");

  if (!month || !day || !year || !hour || !minute || !zoneName) return date.toISOString();
  return `${month} ${day}, ${year} ${timestampSeparator} ${hour}:${minute} ${zoneName}`;
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((item) => item.type === type)?.value;
}
