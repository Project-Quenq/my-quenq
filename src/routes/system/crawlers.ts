import type { Hono } from "hono";
import { robotsText } from "../../server/indexing/crawlers.js";
import { sitemapXml } from "../../server/indexing/sitemap.js";
import type { AppBindings } from "../../server/context.js";

export function registerCrawlerRoutes(app: Hono<AppBindings>) {
  app.get("/ads.txt", (c) => {
    c.header("Content-Type", "text/plain; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.text("google.com, pub-9156391108980330, DIRECT, f08c47fec0942fa0\n");
  });

  app.get("/robots.txt", (c) => {
    c.header("Content-Type", "text/plain; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.text(robotsText());
  });

  app.get("/sitemap.xml", (c) => {
    c.header("Content-Type", "application/xml; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.body(sitemapXml());
  });
}
