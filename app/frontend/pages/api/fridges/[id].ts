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
      fridgeItems: { where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true } },
    },
  });

  if (!fridge) return notFound(res);

  const products = fridge.fridgeItems.map((item) => ({ id: item.id, name: item.name, price: item.price.toFixed(2) }));

  return json(res, 200, { id: fridge.id, name: fridge.name, products });
}
