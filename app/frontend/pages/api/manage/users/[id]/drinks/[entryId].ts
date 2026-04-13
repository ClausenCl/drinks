import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { enforceSameOrigin } from "@backend/lib/security";
import { writeLog } from "@backend/services/logs";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;

  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const userId = typeof req.query.id === "string" ? req.query.id : "";
  const entryId = typeof req.query.entryId === "string" ? req.query.entryId : "";
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
  if (!userId || !entryId) return badRequest(res, "Invalid id");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, houseId: true },
  });
  if (!target || target.role !== UserRole.BEWOHNER) return badRequest(res, "Unknown resident");
  if (session.role === UserRole.GETRAENKEMINISTER && target.houseId !== session.houseId) return unauthorized(res);

  const entry = await prisma.drinkEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      userId: true,
      deleted: true,
      fridgeId: true,
      fridgeItemId: true,
      itemNameAtTime: true,
      quantity: true,
      createdAt: true,
    },
  });
  if (!entry || entry.userId !== target.id) return badRequest(res, "Entry not found");

  if (!entry.deleted) {
    await prisma.drinkEntry.update({ where: { id: entry.id }, data: { deleted: true } });
  }

  await writeLog({
    type: LogType.DRINK_DELETED,
    userId: session.id,
    metadata: {
      managedForUserId: target.id,
      drinkEntryId: entry.id,
      reason: reason || null,
      fridgeId: entry.fridgeId,
      fridgeItemId: entry.fridgeItemId,
      itemNameAtTime: entry.itemNameAtTime,
      quantity: entry.quantity,
      originalCreatedAt: entry.createdAt.toISOString(),
    },
  });

  return json(res, 200, { ok: true, alreadyDeleted: entry.deleted });
}
