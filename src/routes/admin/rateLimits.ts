import { HTTPException } from "hono/http-exception";
import { audit } from "../../server/db/moderation/index.js";
import { disableRaidMode, enableRaidMode, rateLimitActionNames, resetRateLimitSettings, saveRateLimitSettings } from "../../server/db/rateLimits.js";
import { field } from "../../server/forms.js";
import { formAction } from "../../server/http.js";
import { limits } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";

type RateLimitActionInput = { actor: CurrentUser; form: Record<string, unknown> };
type RateLimitRouteAction = (input: RateLimitActionInput) => void;
type RateLimitMode = "reset" | "raid" | "raidOff" | "save";

const rateLimitActions = {
  reset: ({ actor }: RateLimitActionInput) => {
    resetRateLimitSettings();
    audit(actor.id, "reset", "rate_limit", 0);
  },
  raid: ({ actor }: RateLimitActionInput) => {
    enableRaidMode(actor.id);
    audit(actor.id, "enable_raid_mode", "rate_limit", 0);
  },
  raidOff: ({ actor }: RateLimitActionInput) => {
    disableRaidMode();
    audit(actor.id, "disable_raid_mode", "rate_limit", 0);
  },
  save: ({ actor, form }: RateLimitActionInput) => {
    saveRateLimitSettings(
      rateLimitActionNames.map((action) => ({
        action,
        limit: rateLimitNumber(form, `limit_${action}`, "Limit", 0, 10000),
        windowSeconds: rateLimitNumber(form, `window_${action}`, "Window", 1, 60 * 60 * 24 * 30)
      })),
      actor.id
    );
    audit(actor.id, "update", "rate_limit", 0);
  }
} satisfies Record<RateLimitMode, RateLimitRouteAction>;

export function runRateLimitAction(actor: CurrentUser, form: Record<string, unknown>) {
  formAction(rateLimitActions, field(form, "mode"), "Unknown rate limit action.")({ actor, form });
}

function rateLimitNumber(form: Record<string, unknown>, name: string, label: string, min: number, max: number) {
  const value = Number(field(form, name));
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new HTTPException(400, { message: `${label} must be a whole number from ${min} to ${max}.` });
  }
  return value;
}
