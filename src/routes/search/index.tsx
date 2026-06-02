import type { Hono } from "hono";
import { csrfToken, currentUser } from "../../server/auth/session.js";
import { searchSite } from "../../server/db/search.js";
import { queryText } from "../../server/http.js";
import { limits } from "../../policy.js";
import type { AppBindings } from "../../server/context.js";
import { SearchPage } from "../../views/search/index.js";

export function registerSearchRoutes(app: Hono<AppBindings>) {
  app.get("/search", (c) => {
    const user = currentUser(c);
    const query = queryText(c, ["q", "search"], limits.searchQuery);
    return c.html(<SearchPage user={user} csrf={csrfToken(c)} query={query} results={query ? searchSite(query, user) : null} />);
  });
}
