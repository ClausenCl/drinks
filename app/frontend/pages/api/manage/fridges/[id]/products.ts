import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, forbidden, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";
import { writeLog } from "@backend/services/logs";

async function ministerCanAccessFridge(userId: string, fridgeId: string) {
  const perms = await prisma.ministerFridgePermission.findMany({ where: { userId }, select: { fridgeId: true } });
  if (perms.length === 0) return false;
  return perms.some((p) => p.fridgeId === fridgeId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const fridgeId = typeof req.query.id === "string" ? req.query.id : "";
  if (!fridgeId) return notFound(res);

  if (session.role === UserRole.GETRAENKEMINISTER) {
    const ok = await ministerCanAccessFridge(session.id, fridgeId);
    if (!ok) return forbidden(res);
  }

  const productIds = Array.isArray(req.body?.productIds)
    ? (req.body.productIds as unknown[]).filter((x): x is string => typeof x === "string")
    : null;
  if (!productIds) return badRequest(res, "Missing productIds");

  const fridge = await prisma.fridge.findUnique({ where: { id: fridgeId }, select: { id: true } });
  if (!fridge) return notFound(res);

  await prisma.$transaction(async (tx) => {
    await tx.fridgeProduct.deleteMany({ where: { fridgeId } });
    const uniq = Array.from(new Set(productIds));
    for (const pid of uniq) {
      await tx.fridgeProduct.create({ data: { fridgeId, productId: pid } });
    }
  });

  await writeLog({
    type: LogType.PRICE_CHANGED,
    userId: session.id,
    metadata: { fridgeId, productIds },
  });

  return json(res, 200, { ok: true });
}
