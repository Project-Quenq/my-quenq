import type { Hono } from "hono";
import { localBack } from "../../server/http.js";
import type { AppBindings } from "../../server/context.js";

export function registerRefreshRoutes(app: Hono<AppBindings>) {
  app.get("/refresh", (c) => c.redirect(localBack(c, "/")));
}
