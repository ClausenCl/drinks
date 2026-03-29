import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, forbidden, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);

  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, houseId: true, active: true, name: true },
  });
  if (!target) return notFound(res);
  if (target.role !== UserRole.BEWOHNER) return badRequest(res, "TARGET_NOT_RESIDENT");
  if (session.role === UserRole.GETRAENKEMINISTER && target.houseId !== session.houseId) return forbidden(res);

  const nameRaw = typeof req.body?.name === "string" ? req.body.name : "";
  const active = typeof req.body?.active === "boolean" ? req.body.active : undefined;
  const houseIdRaw = typeof req.body?.houseId === "string" ? req.body.houseId : "";
  const requirePinOnPurchaseRaw =
    typeof req.body?.requirePinOnPurchase === "boolean" ? req.body.requirePinOnPurchase : undefined;

  const update: { name?: string; active?: boolean; houseId?: string; requirePinOnPurchase?: boolean } = {};

  if (nameRaw) {
    const normalizedName = normalizeName(nameRaw);
    if (!normalizedName) return badRequest(res, "INVALID_NAME");
    update.name = normalizedName;
  }

  if (active !== undefined) {
    update.active = active;
  }

  if (houseIdRaw) {
    if (session.role !== UserRole.ADMIN) return forbidden(res);
    const house = await prisma.house.findUnique({ where: { id: houseIdRaw }, select: { id: true } });
    if (!house) return badRequest(res, "UNKNOWN_HOUSE");
    update.houseId = house.id;
  }

  if (requirePinOnPurchaseRaw !== undefined) {
    update.requirePinOnPurchase = requirePinOnPurchaseRaw;
  }

  if (Object.keys(update).length === 0) return badRequest(res, "No changes");

  const nextHouseId = update.houseId ?? target.houseId;
  if (update.name) {
    const existingName = await prisma.user.findFirst({
      where: { houseId: nextHouseId, name: { equals: update.name, mode: "insensitive" }, NOT: { id: target.id } },
      select: { id: true },
    });
    if (existingName) return badRequest(res, "NAME_EXISTS_IN_HOUSE");
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: update,
    select: {
      id: true,
      name: true,
      role: true,
      houseId: true,
      active: true,
      pinHash: true,
      requirePinOnPurchase: true,
      createdAt: true,
      updatedAt: true,
      house: { select: { id: true, name: true, color: true } },
    },
  });

  return json(res, 200, {
    id: updated.id,
    name: updated.name,
    role: updated.role,
    houseId: updated.houseId,
    house: updated.house,
    active: updated.active,
    hasPin: Boolean(updated.pinHash),
    requirePinOnPurchase: updated.requirePinOnPurchase,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
