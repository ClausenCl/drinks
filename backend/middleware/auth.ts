import type { NextApiRequest } from "next";
import { UserRole } from "@prisma/client";
import { getSessionUser } from "../services/session";

export type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
  houseId: string;
};

export function requireUser(req: NextApiRequest): SessionUser | null {
  return getSessionUser(req);
}

