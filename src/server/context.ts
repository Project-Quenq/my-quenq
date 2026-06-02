import type { Context } from "hono";
import type { CurrentUser } from "../currentUser.js";

export type AppBindings = {
  Variables: {
    currentUser: CurrentUser | null;
    csrfToken: string;
  };
};

export type AppContext = Context<AppBindings>;
