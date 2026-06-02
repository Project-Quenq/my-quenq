import type { Hono } from "hono";
import { requireAuth, requireProfile, visibleProfile } from "../../server/access.js";
import { csrfToken, currentUser } from "../../server/auth/session.js";
import {
  acceptFriend,
  blockedUsers,
  blockUser,
  friendsFor,
  pendingRequestsFor,
  removeFriend,
  requestFriend,
  sentRequestsFor,
  unblockUser
} from "../../server/db/relationships.js";
import { notifyFriendAccepted } from "../../server/db/notifications/index.js";
import { listUsersPage } from "../../server/db/users.js";
import { field } from "../../server/forms.js";
import { formAction, formId, localBack, verifiedActionForm } from "../../server/http.js";
import { beforeParam, paginationHref } from "../../server/pagination.js";
import { limits } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { BlocksPage, PeoplePage, RequestsPage } from "../../views/people/index.js";
import { profilePath } from "../../paths.js";

type RelationshipActionInput = { c: AppContext; user: CurrentUser; id: number };
type RelationshipAction = (input: RelationshipActionInput) => void;
type FriendActionName = "add" | "accept" | "remove";
type BlockActionName = "block" | "unblock";

const friendActions = {
  add: ({ c, user, id }: RelationshipActionInput) => {
    visibleProfile(c, id);
    if (requestFriend(user.id, id) === "accepted") notifyFriendAccepted(user.id, id);
  },
  accept: ({ user, id }: RelationshipActionInput) => {
    if (acceptFriend(id, user.id)) notifyFriendAccepted(user.id, id);
  },
  remove: ({ user, id }: RelationshipActionInput) => removeFriend(user.id, id)
} satisfies Record<FriendActionName, RelationshipAction>;

const blockActions = {
  block: ({ c, user, id }: RelationshipActionInput) => {
    visibleProfile(c, id);
    blockUser(user.id, id);
  },
  unblock: ({ user, id }: RelationshipActionInput) => unblockUser(user.id, id)
} satisfies Record<BlockActionName, RelationshipAction>;

export function registerPeopleRoutes(app: Hono<AppBindings>) {
  app.get("/browse", (c) => {
    const user = currentUser(c);
    const before = c.req.query(beforeParam);
    const page = listUsersPage(user, { before });
    return c.html(
      <PeoplePage
        user={user}
        title="Browse users"
        people={page.items}
        nextHref={page.nextCursor ? paginationHref("/browse", page.nextCursor) : null}
        resetHref={before ? "/browse" : null}
        seo={{ canonicalPath: "/browse", description: "Browse public profiles from the community." }}
      />
    );
  });

  app.get("/friends", (c) => {
    const user = requireAuth(c);
    const profile = requireProfile(user.id);
    return c.html(<PeoplePage user={user} title={`${profile.username}'s friends`} people={friendsFor(user.id)} />);
  });

  app.post("/friends", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "relationship.write");
    const id = formId(form);
    const action = field(form, "action");
    formAction(friendActions, action, "Unknown friend action.")({ c, user, id });
    return c.redirect(localBack(c, profilePath(requireProfile(id))));
  });

  app.get("/requests", (c) => {
    const user = requireAuth(c);
    return c.html(<RequestsPage user={user} csrf={csrfToken(c)} received={pendingRequestsFor(user.id)} sent={sentRequestsFor(user.id)} />);
  });

  app.get("/blocks", (c) => {
    const user = requireAuth(c);
    return c.html(<BlocksPage user={user} csrf={csrfToken(c)} people={blockedUsers(user.id)} />);
  });

  app.post("/blocks", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "relationship.write");
    const id = formId(form);
    formAction(blockActions, field(form, "action"), "Unknown block action.")({ c, user, id });
    return c.redirect(localBack(c, "/blocks"));
  });
}
