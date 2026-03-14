import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, forbidden, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";
import { writeLog } from "@backend/services/logs";

async function ministerCanEditProduct(userId: string, productId: string) {
  const perms = await prisma.ministerFridgePermission.findMany({ where: { userId }, select: { fridgeId: true } });
  if (perms.length === 0) return true; // default allow-all
  const fridgeIds = perms.map((p) => p.fridgeId);
  const exists = await prisma.fridgeProduct.findFirst({ where: { fridgeId: { in: fridgeIds }, productId }, select: { id: true } });
  return Boolean(exists);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  if (session.role === UserRole.GETRAENKEMINISTER) {
    const ok = await ministerCanEditProduct(session.id, id);
    if (!ok) return forbidden(res);
  }

  const priceRaw = typeof req.body?.price === "string" ? req.body.price.trim() : "";
  const active = typeof req.body?.active === "boolean" ? (req.body.active as boolean) : undefined;
  const update: any = {};

  if (priceRaw) {
    const parsed = Number(priceRaw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return badRequest(res, "Invalid price");
    update.price = parsed.toFixed(2);
  }
  if (active !== undefined) update.active = active;
  if (Object.keys(update).length === 0) return badRequest(res, "No changes");

  const before = await prisma.product.findUnique({ where: { id }, select: { price: true, active: true } });
  if (!before) return notFound(res);

  const updated = await prisma.product.update({
    where: { id },
    data: update,
    select: { id: true, name: true, price: true, active: true },
  });

  await writeLog({
    type: LogType.PRICE_CHANGED,
    userId: session.id,
    metadata: {
      productId: id,
      before: { price: before.price.toFixed(2), active: before.active },
      after: { price: updated.price.toFixed(2), active: updated.active },
    },
  });

  return json(res, 200, { ...updated, price: updated.price.toFixed(2) });
}

