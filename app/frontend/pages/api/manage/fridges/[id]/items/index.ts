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
  if (req.method !== "POST") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const fridgeId = typeof req.query.id === "string" ? req.query.id : "";
  if (!fridgeId) return notFound(res);

  if (session.role === UserRole.GETRAENKEMINISTER) {
    const ok = await ministerCanAccessFridge(session.id, fridgeId);
    if (!ok) return forbidden(res);
  }

  const fridge = await prisma.fridge.findUnique({ where: { id: fridgeId }, select: { id: true, active: true } });
  if (!fridge || !fridge.active) return notFound(res);

  const nameRaw = typeof req.body?.name === "string" ? req.body.name : "";
  const priceRaw = typeof req.body?.price === "string" ? req.body.price.trim() : "";
  const active = typeof req.body?.active === "boolean" ? req.body.active : true;

  const name = normalizeName(nameRaw);
  if (!name || !priceRaw) return badRequest(res, "Missing name or price");

  const parsed = Number(priceRaw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return badRequest(res, "Invalid price");

  const existing = await prisma.fridgeItem.findFirst({
    where: { fridgeId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return badRequest(res, "ITEM_EXISTS_IN_FRIDGE");

  const created = await prisma.fridgeItem.create({
    data: { fridgeId, name, price: parsed.toFixed(2), active },
    select: { id: true, fridgeId: true, name: true, price: true, active: true, createdAt: true },
  });

  return json(res, 201, {
    ...created,
    price: created.price.toFixed(2),
    createdAt: created.createdAt.toISOString(),
  });
}
