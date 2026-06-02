import type { Hono } from "hono";
import { requireAuth } from "../../server/access.js";
import { csrfToken } from "../../server/auth/session.js";
import { markVisibleNotificationsRead, notificationsForUser, unreadNotificationCount } from "../../server/db/notifications/index.js";
import { localBack, verifiedActionForm } from "../../server/http.js";
import { beforeParam, paginationHref } from "../../server/pagination.js";
import { notificationsPath } from "../../paths.js";
import type { AppBindings } from "../../server/context.js";
import { NotificationsPage } from "../../views/notifications/index.js";

export function registerNotificationRoutes(app: Hono<AppBindings>) {
  app.get(notificationsPath, (c) => {
    const user = requireAuth(c);
    const before = c.req.query(beforeParam);
    const unreadCount = unreadNotificationCount(user.id);
    const page = notificationsForUser(user, { before });
    return c.html(
      <NotificationsPage
        user={user}
        csrf={csrfToken(c)}
        notifications={page.items}
        unreadCount={unreadCount}
        nextHref={page.nextCursor ? paginationHref(notificationsPath, page.nextCursor) : null}
        resetHref={before ? notificationsPath : null}
      />
    );
  });

  app.post(notificationsPath, async (c) => {
    const user = requireAuth(c);
    await verifiedActionForm(c, "notification.write");
    markVisibleNotificationsRead(user);
    return c.redirect(localBack(c, notificationsPath));
  });
}
