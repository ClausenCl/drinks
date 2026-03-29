import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, forbidden, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

async function ministerCanAccessFridge(userId: string, fridgeId: string) {
  const perms = await prisma.ministerFridgePermission.findMany({ where: { userId }, select: { fridgeId: true } });
  if (perms.length === 0) return false;
  return perms.some((p) => p.fridgeId === fridgeId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const fridgeId = typeof req.query.id === "string" ? req.query.id : "";
  const itemId = typeof req.query.itemId === "string" ? req.query.itemId : "";
  if (!fridgeId || !itemId) return notFound(res);

  if (session.role === UserRole.GETRAENKEMINISTER) {
    const ok = await ministerCanAccessFridge(session.id, fridgeId);
    if (!ok) return forbidden(res);
  }

  const item = await prisma.fridgeItem.findUnique({ where: { id: itemId }, select: { id: true, fridgeId: true, name: true } });
  if (!item || item.fridgeId !== fridgeId) return notFound(res);

  const nameRaw = typeof req.body?.name === "string" ? req.body.name : "";
  const priceRaw = typeof req.body?.price === "string" ? req.body.price.trim() : "";
  const active = typeof req.body?.active === "boolean" ? req.body.active : undefined;

  const update: { name?: string; price?: string; active?: boolean } = {};

  if (nameRaw) {
    const name = normalizeName(nameRaw);
    if (!name) return badRequest(res, "Invalid name");
    const existing = await prisma.fridgeItem.findFirst({
      where: { fridgeId, name: { equals: name, mode: "insensitive" }, NOT: { id: itemId } },
      select: { id: true },
    });
    if (existing) return badRequest(res, "ITEM_EXISTS_IN_FRIDGE");
    update.name = name;
  }

  if (priceRaw) {
    const parsed = Number(priceRaw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return badRequest(res, "Invalid price");
    update.price = parsed.toFixed(2);
  }

  if (active !== undefined) {
    update.active = active;
  }

  if (Object.keys(update).length === 0) return badRequest(res, "No changes");

  const updated = await prisma.fridgeItem.update({
    where: { id: itemId },
    data: update,
    select: { id: true, fridgeId: true, name: true, price: true, active: true, createdAt: true },
  });

  return json(res, 200, {
    ...updated,
    price: updated.price.toFixed(2),
    createdAt: updated.createdAt.toISOString(),
  });
}
