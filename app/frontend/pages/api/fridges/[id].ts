import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  const fridge = await prisma.fridge.findFirst({
    where: { id, active: true },
    select: {
      id: true,
      name: true,
      fridgeProducts: {
        select: {
          product: { select: { id: true, name: true, price: true, active: true } },
        },
      },
    },
  });

  if (!fridge) return notFound(res);

  const products = fridge.fridgeProducts
    .map((fp) => fp.product)
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, name: p.name, price: p.price.toFixed(2) }));

  return json(res, 200, { id: fridge.id, name: fridge.name, products });
}
