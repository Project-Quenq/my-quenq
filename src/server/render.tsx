import type { ContentfulStatusCode } from "hono/utils/http-status";
import { currentUser } from "./auth/session.js";
import type { AppContext } from "./context.js";
import { PlainPage } from "../shell/index.js";
import { resolveIndexing } from "./indexing/routes.js";
import type { PageSeo } from "../settings/seo.js";
import type { ViewChild } from "../ui/types.js";

export function plainPage(c: AppContext, title: string, body: ViewChild, status = 200, seo?: PageSeo) {
  const resolvedSeo = status === 200 ? plainPageSeo(c) : undefined;
  const pageSeo = resolvedSeo || seo ? { ...resolvedSeo, ...seo } : undefined;
  return c.html(<PlainPage user={currentUser(c) ?? null} title={title} body={body} seo={pageSeo} />, contentfulStatus(status));
}

function contentfulStatus(status: number): ContentfulStatusCode {
  return isContentfulStatus(status) ? status : 500;
}

function isContentfulStatus(status: number): status is ContentfulStatusCode {
  return status >= 200 && status < 600 && ![204, 205, 304].includes(status);
}

function plainPageSeo(c: AppContext) {
  const decision = resolveIndexing(c);
  return decision.index ? { canonicalPath: decision.canonicalPath } : undefined;
}
