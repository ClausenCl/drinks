import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return unauthorized(res);
  return json(res, 200, { id: user.id, name: user.name, role: user.role, houseId: user.houseId });
}
