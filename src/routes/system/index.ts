import type { Hono } from "hono";
import type { AppBindings } from "../../server/context.js";
import { registerBrandingRoutes } from "./branding.js";
import { registerCrawlerRoutes } from "./crawlers.js";
import { registerRefreshRoutes } from "./refresh.js";
import { registerThemeRoutes } from "./theme.js";

export function registerSystemRoutes(app: Hono<AppBindings>) {
  registerCrawlerRoutes(app);
  registerRefreshRoutes(app);
  registerThemeRoutes(app);
  registerBrandingRoutes(app);
}
