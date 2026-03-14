import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";
import { writeLog } from "@backend/services/logs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.BEWOHNER) return unauthorized(res);

  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!token) return badRequest(res, "Missing token");

  const now = new Date();
  const row = await prisma.purchaseUndoToken.findUnique({
    where: { token },
    select: { token: true, purchaseId: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row) return unauthorized(res);
  if (row.userId !== session.id) return unauthorized(res);
  if (row.usedAt) return badRequest(res, "ALREADY_USED");
  if (row.expiresAt.getTime() < now.getTime()) return badRequest(res, "EXPIRED");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.purchaseUndoToken.update({ where: { token }, data: { usedAt: now } });
    const result = await tx.drinkEntry.updateMany({
      where: { purchaseId: row.purchaseId, deleted: false },
      data: { deleted: true },
    });
    return result.count;
  });

  await writeLog({
    type: LogType.DRINK_DELETED,
    userId: session.id,
    metadata: { purchaseId: row.purchaseId, undoneCount: updated },
  });

  return json(res, 200, { ok: true, undoneCount: updated });
}

