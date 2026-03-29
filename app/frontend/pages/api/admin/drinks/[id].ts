import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  const reasonRaw = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  const reason = reasonRaw.slice(0, 300);

  const entry = await prisma.drinkEntry.findUnique({
    where: { id },
    select: {
      id: true,
      deleted: true,
      createdAt: true,
      quantity: true,
      userId: true,
      fridgeItemId: true,
      itemNameAtTime: true,
      fridgeId: true,
    },
  });
  if (!entry) return notFound(res);

  if (entry.deleted) {
    return json(res, 200, { ok: true, alreadyDeleted: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.drinkEntry.update({ where: { id }, data: { deleted: true } });
      await tx.log.create({
        data: {
          type: LogType.DRINK_DELETED,
          userId: session.id,
          metadata: {
            adminDeleted: true,
            reason: reason || null,
            drinkEntryId: entry.id,
            targetUserId: entry.userId,
            fridgeItemId: entry.fridgeItemId,
            itemNameAtTime: entry.itemNameAtTime,
            fridgeId: entry.fridgeId,
            quantity: entry.quantity,
            originalCreatedAt: entry.createdAt.toISOString(),
          },
        },
      });
    });
  } catch {
    return badRequest(res, "DELETE_FAILED");
  }

  return json(res, 200, { ok: true, alreadyDeleted: false });
}
