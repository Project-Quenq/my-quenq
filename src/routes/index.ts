import type { Hono } from "hono";
import { registerAccountRoutes } from "./account/index.js";
import { registerAdminRoutes } from "./admin/index.js";
import { registerAuthRoutes } from "./auth/index.js";
import { registerBlogRoutes } from "./blogs/index.js";
import { registerGroupRoutes } from "./groups/index.js";
import { registerMessageRoutes } from "./messages/index.js";
import { registerModerationRoutes } from "./moderation/index.js";
import { registerNotificationRoutes } from "./notifications/index.js";
import { registerPeopleRoutes } from "./people/index.js";
import { registerPostRoutes } from "./posts/index.js";
import { registerProfileRoutes } from "./profile/index.js";
import { registerReportRoutes } from "./reports/index.js";
import { registerSearchRoutes } from "./search/index.js";
import { registerSkinRoutes } from "./skins/index.js";
import { registerSiteRoutes } from "./site/index.js";
import type { AppBindings } from "../server/context.js";

type RouteRegistrar = (app: Hono<AppBindings>) => void;

export const routeRegistrars: readonly RouteRegistrar[] = [
  registerAuthRoutes,
  registerProfileRoutes,
  registerSearchRoutes,
  registerPeopleRoutes,
  registerPostRoutes,
  registerReportRoutes,
  registerNotificationRoutes,
  registerBlogRoutes,
  registerMessageRoutes,
  registerGroupRoutes,
  registerSkinRoutes,
  registerAccountRoutes,
  registerAdminRoutes,
  registerModerationRoutes,
  registerSiteRoutes
];
