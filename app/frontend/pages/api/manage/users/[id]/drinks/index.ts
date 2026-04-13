import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { enforceSameOrigin } from "@backend/lib/security";
import { writeLog } from "@backend/services/logs";
import { getSessionUser } from "@backend/services/session";

function parseQuantity(input: unknown) {
  if (!Number.isInteger(input)) return 1;
  const quantity = input as number;
  if (quantity < 1) return 1;
  return Math.min(quantity, 99);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;

  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const userId = typeof req.query.id === "string" ? req.query.id : "";
  const fridgeId = typeof req.body?.fridgeId === "string" ? req.body.fridgeId : "";
  const fridgeItemId = typeof req.body?.fridgeItemId === "string" ? req.body.fridgeItemId : "";
  const quantity = parseQuantity(req.body?.quantity);

  if (!userId || !fridgeId || !fridgeItemId) return badRequest(res, "Invalid payload");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, houseId: true, active: true },
  });
  if (!target || !target.active || target.role !== UserRole.BEWOHNER) return badRequest(res, "Unknown resident");
  if (session.role === UserRole.GETRAENKEMINISTER && target.houseId !== session.houseId) return unauthorized(res);

  if (session.role === UserRole.GETRAENKEMINISTER) {
    const allowed = await prisma.ministerFridgePermission.findFirst({
      where: { userId: session.id, fridgeId },
      select: { id: true },
    });
    if (!allowed) return unauthorized(res);
  }

  const [fridge, fridgeItem] = await Promise.all([
    prisma.fridge.findFirst({ where: { id: fridgeId, active: true }, select: { id: true } }),
    prisma.fridgeItem.findFirst({
      where: { id: fridgeItemId, fridgeId, active: true },
      select: { id: true, name: true, price: true },
    }),
  ]);
  if (!fridge || !fridgeItem) return badRequest(res, "Unknown fridge/item");

  const entry = await prisma.drinkEntry.create({
    data: {
      userId: target.id,
      fridgeId,
      fridgeItemId: fridgeItem.id,
      quantity,
      itemNameAtTime: fridgeItem.name,
      priceAtTime: fridgeItem.price,
    },
    select: {
      id: true,
      createdAt: true,
      quantity: true,
      itemNameAtTime: true,
      priceAtTime: true,
      billedInId: true,
      fridge: { select: { id: true, name: true } },
    },
  });

  await writeLog({
    type: LogType.DRINK_ADDED,
    userId: session.id,
    metadata: {
      managedForUserId: target.id,
      drinkEntryId: entry.id,
      fridgeId,
      fridgeItemId,
      quantity,
    },
  });

  return json(res, 201, {
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    quantity: entry.quantity,
    unitPrice: entry.priceAtTime.toFixed(2),
    total: (Number(entry.priceAtTime.toFixed(2)) * entry.quantity).toFixed(2),
    billed: Boolean(entry.billedInId),
    fridge: entry.fridge,
    itemName: entry.itemNameAtTime,
  });
}
