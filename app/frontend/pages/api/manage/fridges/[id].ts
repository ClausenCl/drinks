import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { forbidden, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

async function ministerCanAccessFridge(userId: string, fridgeId: string) {
  const perms = await prisma.ministerFridgePermission.findMany({ where: { userId }, select: { fridgeId: true } });
  if (perms.length === 0) return true; // default allow-all
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
      fridgeProducts: { select: { productId: true } },
    },
  });
  if (!fridge) return notFound(res);

  const inFridge = new Set(fridge.fridgeProducts.map((fp) => fp.productId));
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true, active: true },
  });

  return json(res, 200, {
    id: fridge.id,
    name: fridge.name,
    locationDescription: fridge.locationDescription,
    active: fridge.active,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      price: p.price.toFixed(2),
      inFridge: inFridge.has(p.id),
    })),
  });
}

