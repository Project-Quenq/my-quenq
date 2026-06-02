import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { sqlite } from "../db/client.js";
import { env } from "../env.js";
import { session } from "../../policy.js";
import { normalizeTimeZone } from "../../timeZones.js";
import type { CurrentUser } from "../../currentUser.js";
import type { AppBindings, AppContext } from "../context.js";
import { randomToken, safeEqual, sha256 } from "../security/crypto.js";

export const loadSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = getCookie(c, session.cookieName);
  let user: CurrentUser | null = null;
  let csrfToken = getCookie(c, session.csrfCookieName) ?? randomToken(session.csrfTokenBytes);

  if (token) {
    const row = sqlite
      .prepare(
        `SELECT s.id AS sessionId, s.csrf_token AS csrfToken, s.expires_at AS expiresAt,
          u.id, u.username, u.email, u.role, u.time_zone AS timeZone, u.verified_at AS verifiedAt, u.banned_at AS bannedAt
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.revoked_at IS NULL AND u.banned_at IS NULL`
      )
      .get(sha256(token)) as
      | (CurrentUser & {
          sessionId: number;
          csrfToken: string;
          expiresAt: string;
        })
      | undefined;

    if (row && new Date(row.expiresAt).getTime() > Date.now()) {
      user = {
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        timeZone: normalizeTimeZone(row.timeZone),
        verifiedAt: row.verifiedAt,
        bannedAt: row.bannedAt
      };
      csrfToken = row.csrfToken;
    } else {
      if (row) revokeSession(row.sessionId);
      deleteCookie(c, session.cookieName, { path: "/" });
    }
  }

  c.set("currentUser", user);
  c.set("csrfToken", csrfToken);
  setCookie(c, session.csrfCookieName, csrfToken, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: env.secureCookies,
    maxAge: session.anonCsrfMaxAgeSeconds
  });

  await next();
};

export function currentUser(c: AppContext) {
  return c.get("currentUser");
}

export function csrfToken(c: AppContext) {
  return c.get("csrfToken");
}

export function assertCsrf(c: AppContext, formToken: unknown) {
  const expected = csrfToken(c);
  if (typeof formToken !== "string" || !safeEqual(expected, formToken)) {
    throw new HTTPException(403, { message: "Invalid CSRF token." });
  }
}

export function createSession(c: AppContext, userId: number) {
  const token = randomToken(session.tokenBytes);
  const csrf = randomToken(session.csrfTokenBytes);
  const expires = new Date(Date.now() + session.maxAgeSeconds * 1000).toISOString();
  sqlite.transaction(() => {
    pruneUserSessions(userId);
    sqlite
      .prepare("INSERT INTO sessions (token_hash, csrf_token, user_id, expires_at) VALUES (?, ?, ?, ?)")
      .run(sha256(token), csrf, userId, expires);
  })();

  setCookie(c, session.cookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: env.secureCookies,
    maxAge: session.maxAgeSeconds
  });
}

export function revokeUserSessions(userId: number, exceptTokenHash?: string) {
  if (exceptTokenHash) {
    sqlite
      .prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL AND token_hash <> ?")
      .run(userId, exceptTokenHash);
    return;
  }
  sqlite.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL").run(userId);
}

export function revokeOtherSessions(c: AppContext, userId: number) {
  const token = getCookie(c, session.cookieName);
  revokeUserSessions(userId, token ? sha256(token) : undefined);
}

export function destroySession(c: AppContext) {
  const token = getCookie(c, session.cookieName);
  if (token) {
    sqlite.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?").run(sha256(token));
  }
  deleteCookie(c, session.cookieName, { path: "/" });
  deleteCookie(c, session.csrfCookieName, { path: "/" });
}

function revokeSession(sessionId: number) {
  sqlite.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND revoked_at IS NULL").run(sessionId);
}

function pruneUserSessions(userId: number) {
  sqlite.prepare("DELETE FROM sessions WHERE user_id = ? AND (revoked_at IS NOT NULL OR datetime(expires_at) <= CURRENT_TIMESTAMP)").run(userId);
}
