import type { UserRole } from "./roles.js";

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  timeZone: string;
  verifiedAt?: string | null;
  bannedAt?: string | null;
};
