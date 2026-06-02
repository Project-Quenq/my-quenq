import { HTTPException } from "hono/http-exception";
import { env } from "./env.js";

export function isProtectedAdminAccount(target: { id: number }) {
  return target.id === env.adminUserId;
}

export function assertMutableManagedUser(target: { id: number }) {
  if (isProtectedAdminAccount(target)) {
    throw new HTTPException(403, { message: "The protected admin account cannot be modified." });
  }
}
