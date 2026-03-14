import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

async function getAllowedFridges(userId: string) {
  const perms = await prisma.ministerFridgePermission.findMany({ where: { userId }, select: { fridgeId: true } });
  return perms.map((p) => p.fridgeId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  let where: any = { active: true };
  if (session.role === UserRole.GETRAENKEMINISTER) {
    const allowed = await getAllowedFridges(session.id);
    if (allowed.length === 0) return json(res, 200, []);
    where = { ...where, id: { in: allowed } };
  }

  const fridges = await prisma.fridge.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return json(res, 200, fridges);
}
