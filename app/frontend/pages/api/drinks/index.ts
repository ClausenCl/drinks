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

  const fridgeId = typeof req.body?.fridgeId === "string" ? req.body.fridgeId : "";
  const productId = typeof req.body?.productId === "string" ? req.body.productId : "";
  const quantity = Number.isInteger(req.body?.quantity) ? (req.body.quantity as number) : 1;
  if (!fridgeId || !productId || quantity < 1) return badRequest(res, "Invalid payload");

  const [fridge, product, fp] = await Promise.all([
    prisma.fridge.findUnique({ where: { id: fridgeId } }),
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.fridgeProduct.findFirst({ where: { fridgeId, productId } }),
  ]);

  if (!fridge || !fridge.active) return badRequest(res, "Unknown fridge");
  if (!product || !product.active) return badRequest(res, "Unknown product");
  if (!fp) return badRequest(res, "Product not available in this fridge");

  const entry = await prisma.drinkEntry.create({
    data: {
      userId: session.id,
      fridgeId,
      productId,
      quantity,
      priceAtTime: product.price,
    },
    select: { id: true, createdAt: true },
  });

  await writeLog({
    type: LogType.DRINK_ADDED,
    userId: session.id,
    metadata: { drinkEntryId: entry.id, fridgeId, productId, quantity },
  });

  return json(res, 200, { id: entry.id, createdAt: entry.createdAt.toISOString() });
}
