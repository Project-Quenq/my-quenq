import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { routeRegistrars } from "./routes/index.js";
import { registerSystemRoutes } from "./routes/system/index.js";
import { registerMediaRoutes } from "./routes/system/media.js";
import { loadSession } from "./server/auth/session.js";
import { initializeDatabase } from "./server/db/schema.js";
import { siteSettings } from "./server/db/siteSettings.js";
import { env } from "./server/env.js";
import { statusTitle } from "./server/http.js";
import { blockedCrawlerMiddleware } from "./server/indexing/crawlers.js";
import { indexingMiddleware } from "./server/indexing/middleware.js";
import { limits } from "./policy.js";
import { plainPage } from "./server/render.js";
import { securityHeaders } from "./server/security/headers.js";
import type { AppBindings } from "./server/context.js";

initializeDatabase();

const app = new Hono<AppBindings>();

app.use(async (c, next) => {
  try {
    await next();
  } finally {
    for (const [name, value] of Object.entries(securityHeaders)) c.header(name, value);
  }
});
app.use(
  bodyLimit({
    maxSize: limits.requestBytes,
    onError: () => {
      throw new HTTPException(413, { message: "Request body is too large." });
    }
  })
);

app.use(blockedCrawlerMiddleware());
app.use("/static/*", serveStatic({ root: "./public" }));
registerSystemRoutes(app);
app.use(loadSession);
app.use(indexingMiddleware());
registerMediaRoutes(app);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    const response = error.getResponse();
    if (response.status >= 300 && response.status < 400) return response;
    return plainPage(c, statusTitle(response.status), error.message || "The request could not be completed.", response.status);
  }
  console.error(error);
  return plainPage(c, "Something went wrong", "The server could not complete the request.", 500);
});
app.notFound((c) => plainPage(c, "Not found", "The page does not exist.", 404));

for (const registerRoutes of routeRegistrars) {
  registerRoutes(app);
}

serve({ fetch: app.fetch, port: env.port, hostname: env.host }, (info) => {
  console.log(`${siteSettings().identity.name} listening on http://${info.address}:${info.port}`);
});
