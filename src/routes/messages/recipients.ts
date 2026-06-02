import { HTTPException } from "hono/http-exception";
import type { CurrentUser } from "../../currentUser.js";
import { profilePath } from "../../paths.js";
import type { UserProfile } from "../../models.js";
import { visibleProfile } from "../../server/access.js";
import type { AppContext } from "../../server/context.js";
import { env } from "../../server/env.js";
import { optionalId } from "../../server/http.js";
import { profileByHandle } from "../../server/db/users.js";

export function queryRecipient(c: AppContext) {
  const to = c.req.query("to");
  return to ? visibleMessageRecipient(c, to) : undefined;
}

export function visibleMessageRecipient(c: AppContext, value: string) {
  const handle = recipientHandle(value);
  const profile = profileByHandle(handle);
  if (!profile) throw new HTTPException(400, { message: "Recipient not found." });
  return visibleProfile(c, profile.id).profile;
}

export function assertMessageRecipient(sender: CurrentUser, receiver: UserProfile) {
  if (sender.id === receiver.id) throw new HTTPException(400, { message: "You cannot send messages to yourself." });
}

export function recipientHandle(value: string) {
  const handle = value.trim().replace(/^@/, "").toLowerCase();
  if (!handle) throw new HTTPException(400, { message: "Recipient handle is required." });
  return handle;
}

export function forwardedProfileMessage(c: AppContext) {
  if (c.req.query("forward") !== "profile") return undefined;
  const id = optionalId(c.req.query("id"));
  if (!id) throw new HTTPException(400, { message: "Invalid profile to forward." });
  const profile = visibleProfile(c, id).profile;
  return {
    subject: `Profile: ${profile.username}`,
    body: `Check out ${profile.username}'s profile:\n${env.baseUrl}${profilePath(profile)}`
  };
}
