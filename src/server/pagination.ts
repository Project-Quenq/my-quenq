import { recordFromUnknown } from "../values.js";

export const beforeParam = "before";

type KeysetCursor = {
  createdAt: string;
  id: number;
};

export type PageOptions = {
  before?: string | null;
  limit?: number;
};

type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

type KeysetRow = {
  createdAt: string;
  id: number;
};

const cursorVersion = 1;
const maxCursorLength = 512;

export function decodeKeysetCursor(value?: string | null): KeysetCursor | null {
  if (!value) return null;
  if (value.length > maxCursorLength) return null;

  try {
    const decoded = recordFromUnknown(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    if (decoded.v !== cursorVersion) return null;
    const createdAt = decoded.createdAt;
    if (typeof createdAt !== "string" || !createdAt) return null;
    const id = decoded.id;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function encodeKeysetCursor(row: KeysetRow) {
  return Buffer.from(JSON.stringify({ v: cursorVersion, createdAt: row.createdAt, id: row.id })).toString("base64url");
}

export function normalizePageLimit(limit: number | undefined, fallback: number, max: number) {
  const value = typeof limit === "number" && Number.isSafeInteger(limit) && limit > 0 ? limit : fallback;
  return Math.min(value, max);
}

export function keysetBeforeCondition(cursor: KeysetCursor | null, timestampSql: string, idSql: string): { sql: string; params: unknown[] } {
  if (!cursor) return { sql: "", params: [] };
  return {
    sql: `AND (${timestampSql} < ? OR (${timestampSql} = ? AND ${idSql} < ?))`,
    params: [cursor.createdAt, cursor.createdAt, cursor.id]
  };
}

/**
 * Builds a keyset page from a query result. Caller must fetch `limit + 1`
 * rows; the extra row is what signals "there is a next page". If only
 * `limit` (or fewer) rows came back, nextCursor is null.
 */
export function pageFromRows<T extends KeysetRow>(rows: T[], limit: number, cursorFor: (row: T) => KeysetRow = (row) => row): Page<T> {
  const items = rows.slice(0, limit);
  const lastItem = items.at(-1);
  const nextCursor = rows.length > limit && lastItem ? encodeKeysetCursor(cursorFor(lastItem)) : null;
  return { items, nextCursor };
}

export function previewFromRows<T>(rows: T[], limit: number) {
  return {
    items: rows.slice(0, limit),
    hasMore: rows.length > limit
  };
}

export function paginationHref(path: string, cursor: string | null, param = beforeParam) {
  const [base, query = ""] = path.split("?", 2);
  const params = new URLSearchParams(query);
  if (cursor) {
    params.set(param, cursor);
  } else {
    params.delete(param);
  }
  const nextQuery = params.toString();
  return nextQuery ? `${base}?${nextQuery}` : base;
}
