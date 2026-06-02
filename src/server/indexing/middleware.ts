import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../context.js";
import { crawlerKind } from "./crawlers.js";
import { noindexHeader, resolveIndexing } from "./routes.js";
import { absoluteUrl } from "./urls.js";

export function indexingMiddleware(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const decision = resolveIndexing(c);
    const crawler = crawlerKind(c.req.header("user-agent"));

    if (crawler === "blocked" || (crawler === "crawler" && !decision.index)) {
      c.header("X-Robots-Tag", noindexHeader);
      c.header("Cache-Control", "private, no-store");
      return c.text("Crawler access is not allowed for this page.", 403);
    }

    try {
      await next();
    } finally {
      if (decision.index) {
        c.header("Link", `<${absoluteUrl(decision.canonicalPath)}>; rel="canonical"`);
      } else {
        c.header("X-Robots-Tag", noindexHeader);
      }
    }
  };
}
