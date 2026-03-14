import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.BEWOHNER) return unauthorized(res);

  const entries = await prisma.drinkEntry.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      quantity: true,
      priceAtTime: true,
      deleted: true,
      fridge: { select: { name: true } },
      product: { select: { name: true } },
    },
  });

  return json(
    res,
    200,
    entries.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      fridgeName: e.fridge.name,
      productName: e.product.name,
      quantity: e.quantity,
      priceAtTime: e.priceAtTime.toFixed(2),
      deleted: e.deleted,
    }))
  );
}
