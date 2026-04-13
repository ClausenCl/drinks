import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { enforceSameOrigin } from "@backend/lib/security";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;

  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const userId = typeof req.query.id === "string" ? req.query.id : "";
  const chargeId = typeof req.query.chargeId === "string" ? req.query.chargeId : "";
  if (!userId || !chargeId) return badRequest(res, "Invalid id");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, houseId: true },
  });
  if (!target || target.role !== UserRole.BEWOHNER) return badRequest(res, "Unknown resident");
  if (session.role === UserRole.GETRAENKEMINISTER && target.houseId !== session.houseId) return unauthorized(res);

  const charge = await prisma.manualCharge.findUnique({
    where: { id: chargeId },
    select: { id: true, userId: true, billedInId: true },
  });
  if (!charge || charge.userId !== target.id) return badRequest(res, "Charge not found");
  if (charge.billedInId) return badRequest(res, "CHARGE_ALREADY_BILLED");

  await prisma.manualCharge.delete({ where: { id: charge.id } });
  return json(res, 200, { ok: true });
}
