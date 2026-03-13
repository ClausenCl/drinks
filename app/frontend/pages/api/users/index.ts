import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { forbidden, methodNotAllowed, notImplemented, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return forbidden(res);
  return notImplemented(res);
}
