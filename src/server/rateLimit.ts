import { HTTPException } from "hono/http-exception";
import { currentUser } from "./auth/session.js";
import { consumeRateLimit, rateLimitPolicyFor } from "./db/rateLimits.js";
import { rateLimits, type RateLimitAction } from "../policy.js";
import { sha256 } from "./security/crypto.js";
import type { AppContext } from "./context.js";

export function assertActionRateLimit(c: AppContext, action: RateLimitAction, publicFormSubject?: string) {
  const policy = rateLimitPolicyFor(action);
  const subject = rateLimitSubject(c, publicFormSubject);
  const allowed = consumeRateLimit({
    action,
    subjectHash: sha256(subject),
    limit: policy.limit,
    pruneAfterSeconds: rateLimits.pruneAfterSeconds,
    windowSeconds: policy.windowSeconds
  });

  if (!allowed) throw new HTTPException(429, { message: rateLimits.message });
}

function rateLimitSubject(c: AppContext, publicFormSubject: string | undefined) {
  const user = currentUser(c);
  if (user) return `user:${user.id}`;
  if (publicFormSubject) return publicFormSubject;
  throw new HTTPException(400, { message: "This form is missing rate-limit subject data." });
}
