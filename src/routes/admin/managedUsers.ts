import { HTTPException } from "hono/http-exception";
import { assertMutableManagedUser } from "../../server/adminProtection.js";
import { hashPassword } from "../../server/auth/password.js";
import { revokeUserSessions } from "../../server/auth/session.js";
import { requestPasswordReset } from "../../server/db/email.js";
import { markUserVerified, setUserBanned, setUserRole, updatePassword } from "../../server/db/users.js";
import { field } from "../../server/forms.js";
import { formAction } from "../../server/http.js";
import { characterRangeLabel, limits, validPassword } from "../../policy.js";
import { isUserRole, type UserRole } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";

type ManagedUserTarget = { id: number; email: string; verifiedAt?: string | null };
type ManagedUserActionInput = { actor: CurrentUser; form: Record<string, unknown>; target: ManagedUserTarget };
type ManagedUserAction = (input: ManagedUserActionInput) => void | Promise<void>;
type ManagedUserActionName = "verify" | "ban" | "unban" | "reset" | "role" | "password";

const managedUserActions = {
  verify: ({ target }: ManagedUserActionInput) => {
    if (target.verifiedAt) throw new HTTPException(400, { message: "User is already verified." });
    markUserVerified(target.id);
  },
  ban: ({ actor, target }: ManagedUserActionInput) => {
    if (target.id === actor.id) throw new HTTPException(400, { message: "You cannot ban your own account." });
    setUserBanned(target.id, true);
    revokeUserSessions(target.id);
  },
  unban: ({ target }: ManagedUserActionInput) => setUserBanned(target.id, false),
  reset: ({ target }: ManagedUserActionInput) => requestPasswordReset(target.email),
  role: ({ actor, form, target }: ManagedUserActionInput) => {
    const role = requiredUserRole(field(form, "role"));
    if (target.id === actor.id && role !== "admin") throw new HTTPException(400, { message: "You cannot remove your own admin role." });
    setUserRole(target.id, role);
  },
  password: async ({ form, target }: ManagedUserActionInput) => {
    const password = field(form, "password");
    if (!validPassword(password)) throw new HTTPException(400, { message: `Password must be ${characterRangeLabel(limits.passwordMin, limits.passwordMax)}.` });
    updatePassword(target.id, await hashPassword(password));
    revokeUserSessions(target.id);
  }
} satisfies Record<ManagedUserActionName, ManagedUserAction>;

export async function runManagedUserAction(actor: CurrentUser, form: Record<string, unknown>, target: ManagedUserTarget) {
  assertMutableManagedUser(target);
  const action = field(form, "action");
  await formAction(managedUserActions, action, "Unknown admin action.")({ actor, form, target });
  return action;
}

function requiredUserRole(value: string): UserRole {
  if (isUserRole(value)) return value;
  throw new HTTPException(400, { message: "Unknown user role." });
}
