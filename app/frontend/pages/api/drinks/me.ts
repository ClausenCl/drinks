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

  const billed = typeof req.query.billed === "string" ? req.query.billed : "all";
  const billedWhere =
    billed === "unbilled" ? { billedInId: null } : billed === "billed" ? { billedInId: { not: null } } : {};

  const entries = await prisma.drinkEntry.findMany({
    where: { userId: session.id, ...billedWhere },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      quantity: true,
      itemNameAtTime: true,
      priceAtTime: true,
      deleted: true,
      billedInId: true,
      fridge: { select: { name: true } },
    },
  });

  return json(
    res,
    200,
    entries.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      fridgeName: e.fridge.name,
      productName: e.itemNameAtTime,
      quantity: e.quantity,
      priceAtTime: e.priceAtTime.toFixed(2),
      deleted: e.deleted,
      billed: Boolean(e.billedInId),
    }))
  );
}
