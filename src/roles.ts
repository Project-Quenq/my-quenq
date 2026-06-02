export const userRoles = ["user", "moderator", "admin"] as const;

export type UserRole = (typeof userRoles)[number];
const userRoleSet = new Set<string>(userRoles);

type RoleUser = {
  id?: number;
  role?: string | null;
};

export type Permission = "admin" | "moderateReports" | "moderateContent" | "banUsers";

const permissionsByRole: Record<UserRole, Set<Permission>> = {
  user: new Set(),
  moderator: new Set(["moderateReports", "moderateContent", "banUsers"]),
  admin: new Set(["admin", "moderateReports", "moderateContent", "banUsers"])
};

const roleWeight: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2
};

export function normalizeRole(value: string | null | undefined): UserRole {
  return isUserRole(value) ? value : "user";
}

export function isUserRole(value: string | null | undefined): value is UserRole {
  return typeof value === "string" && userRoleSet.has(value);
}

function roleFor(user: RoleUser | null | undefined): UserRole {
  return normalizeRole(user?.role);
}

export function hasPermission(user: RoleUser | null | undefined, permission: Permission) {
  return permissionsByRole[roleFor(user)].has(permission);
}

export function isAdminUser(user: RoleUser | null | undefined) {
  return hasPermission(user, "admin");
}

export function canModerateContent(user: RoleUser | null | undefined) {
  return hasPermission(user, "moderateContent");
}

export function canViewReports(user: RoleUser | null | undefined) {
  return hasPermission(user, "moderateReports");
}

export function canBanUsers(user: RoleUser | null | undefined) {
  return hasPermission(user, "banUsers");
}

export function canBypassVisibility(user: RoleUser | null | undefined) {
  return canViewReports(user);
}

export function canModerateTarget(actor: RoleUser, target: RoleUser) {
  if (!actor.id || !target.id || actor.id === target.id) return false;
  if (isAdminUser(actor)) return true;
  if (!canModerateContent(actor)) return false;
  return roleWeight[roleFor(actor)] > roleWeight[roleFor(target)];
}
