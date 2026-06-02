import type { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "../../server/env.js";
import { localBack } from "../../server/http.js";
import { themePreference } from "../../policy.js";
import { brandingSettings } from "../../server/db/branding.js";
import type { AppBindings, AppContext } from "../../server/context.js";

const darkThemeCss = '@import url("/static/css/themes/dark.css");\n';

function currentTheme(c: AppContext) {
  return getCookie(c, themePreference.cookieName) === "dark" ? "dark" : "light";
}

function setNextTheme(c: AppContext) {
  const nextTheme = safeCustomBrandingActive() ? "light" : currentTheme(c) === "dark" ? "light" : "dark";
  setCookie(c, themePreference.cookieName, nextTheme, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: env.secureCookies,
    maxAge: themePreference.maxAgeSeconds
  });
}

function safeCustomBrandingActive() {
  try {
    return brandingSettings().customized;
  } catch {
    return false;
  }
}

export function registerThemeRoutes(app: Hono<AppBindings>) {
  app.get("/theme", (c) => {
    setNextTheme(c);
    return c.redirect(localBack(c, "/"));
  });

  app.get("/theme.css", (c) => {
    c.header("Content-Type", "text/css; charset=utf-8");
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    return c.body(!safeCustomBrandingActive() && currentTheme(c) === "dark" ? darkThemeCss : "");
  });
}
