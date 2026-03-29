import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      role: true,
      houseId: true,
      active: true,
      requirePinOnPurchase: true,
      house: { select: { name: true, color: true } },
    },
  });
  if (!user || !user.active) return unauthorized(res);
  return json(res, 200, {
    id: user.id,
    name: user.name,
    role: user.role,
    houseId: user.houseId,
    requirePinOnPurchase: user.requirePinOnPurchase,
    houseName: user.house.name,
    houseColor: user.house.color,
  });
}
