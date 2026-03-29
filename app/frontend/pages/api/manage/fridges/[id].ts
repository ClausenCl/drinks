import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { forbidden, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

async function ministerCanAccessFridge(userId: string, fridgeId: string) {
  const perms = await prisma.ministerFridgePermission.findMany({ where: { userId }, select: { fridgeId: true } });
  if (perms.length === 0) return false;
  return perms.some((p) => p.fridgeId === fridgeId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  if (session.role === UserRole.GETRAENKEMINISTER) {
    const ok = await ministerCanAccessFridge(session.id, id);
    if (!ok) return forbidden(res);
  }

  const fridge = await prisma.fridge.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      locationDescription: true,
      active: true,
      fridgeItems: {
        orderBy: [{ active: "desc" }, { name: "asc" }],
        select: { id: true, name: true, price: true, active: true, createdAt: true },
      },
    },
  });
  if (!fridge) return notFound(res);

  return json(res, 200, {
    id: fridge.id,
    name: fridge.name,
    locationDescription: fridge.locationDescription,
    active: fridge.active,
    items: fridge.fridgeItems.map((item) => ({
      id: item.id,
      name: item.name,
      active: item.active,
      price: item.price.toFixed(2),
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
