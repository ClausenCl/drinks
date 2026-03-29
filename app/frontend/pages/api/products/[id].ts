import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, forbidden, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";
import { writeLog } from "@backend/services/logs";

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

async function ministerCanEditProduct(userId: string, productId: string) {
  const perms = await prisma.ministerFridgePermission.findMany({
    where: { userId },
    select: { fridgeId: true },
  });
  if (perms.length === 0) return false;

  const allowedFridgeIds = perms.map((perm) => perm.fridgeId);
  const exists = await prisma.fridgeProduct.findFirst({
    where: { productId, fridgeId: { in: allowedFridgeIds } },
    select: { id: true },
  });
  return Boolean(exists);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN && session.role !== UserRole.GETRAENKEMINISTER) return forbidden(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  if (session.role === UserRole.GETRAENKEMINISTER) {
    const allowed = await ministerCanEditProduct(session.id, id);
    if (!allowed) return forbidden(res);
  }

  const nameRaw = typeof req.body?.name === "string" ? req.body.name : "";
  const priceRaw = typeof req.body?.price === "string" ? req.body.price.trim() : "";
  const active = typeof req.body?.active === "boolean" ? req.body.active : undefined;

  if (session.role === UserRole.GETRAENKEMINISTER && (nameRaw || active !== undefined)) {
    return forbidden(res);
  }

  const update: { name?: string; price?: string; active?: boolean } = {};

  if (nameRaw) {
    const name = normalizeName(nameRaw);
    if (!name) return badRequest(res, "Invalid name");
    update.name = name;
  }

  if (priceRaw) {
    const parsed = Number(priceRaw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return badRequest(res, "Invalid price");
    update.price = parsed.toFixed(2);
  }

  if (session.role === UserRole.ADMIN && active !== undefined) {
    update.active = active;
  }

  if (Object.keys(update).length === 0) return badRequest(res, "No changes");

  const before = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, price: true, active: true },
  });
  if (!before) return notFound(res);

  if (update.name) {
    const existing = await prisma.product.findFirst({
      where: { name: { equals: update.name, mode: "insensitive" }, NOT: { id } },
      select: { id: true },
    });
    if (existing) return badRequest(res, "PRODUCT_EXISTS");
  }

  const updated = await prisma.product.update({
    where: { id },
    data: update,
    select: { id: true, name: true, price: true, active: true, createdAt: true },
  });

  await writeLog({
    type: LogType.PRICE_CHANGED,
    userId: session.id,
    metadata: {
      productId: id,
      before: { name: before.name, price: before.price.toFixed(2), active: before.active },
      after: { name: updated.name, price: updated.price.toFixed(2), active: updated.active },
    },
  });

  return json(res, 200, {
    ...updated,
    price: updated.price.toFixed(2),
    createdAt: updated.createdAt.toISOString(),
  });
}
