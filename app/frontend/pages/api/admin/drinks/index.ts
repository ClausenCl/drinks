import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

function parsePositiveInt(input: unknown, fallback: number, max: number) {
  const n = typeof input === "string" ? Number.parseInt(input, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return unauthorized(res);

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const houseId = typeof req.query.houseId === "string" ? req.query.houseId : "";
  const fridgeId = typeof req.query.fridgeId === "string" ? req.query.fridgeId : "";
  const includeDeleted = req.query.includeDeleted === "true";
  const take = parsePositiveInt(req.query.take, 100, 300);

  const where = {
    ...(includeDeleted ? {} : { deleted: false }),
    ...(houseId ? { user: { houseId } } : {}),
    ...(fridgeId ? { fridgeId } : {}),
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { itemNameAtTime: { contains: q, mode: "insensitive" as const } },
            { fridge: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const entries = await prisma.drinkEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      createdAt: true,
      quantity: true,
      priceAtTime: true,
      deleted: true,
      billedInId: true,
      fridgeItemId: true,
      itemNameAtTime: true,
      user: { select: { id: true, name: true, house: { select: { id: true, name: true } } } },
      fridge: { select: { id: true, name: true } },
    },
  });

  return json(
    res,
    200,
    entries.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      quantity: entry.quantity,
      priceAtTime: entry.priceAtTime.toFixed(2),
      deleted: entry.deleted,
      billed: Boolean(entry.billedInId),
      user: entry.user,
      fridge: entry.fridge,
      product: { id: entry.fridgeItemId, name: entry.itemNameAtTime },
    }))
  );
}
