import { UserRole } from "@prisma/client";
import type { SessionUser } from "./auth";

export function hasRole(user: SessionUser, allowed: UserRole[]) {
  return allowed.includes(user.role);
}

