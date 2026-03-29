import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { hashPin } from "@backend/services/pin";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const userId = typeof req.query.id === "string" ? req.query.id : "";
  if (!userId) return badRequest(res, "Missing userId");

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, houseId: true } });
  if (!target || target.role !== UserRole.BEWOHNER) return badRequest(res, "Not a resident");
  if (session.role === UserRole.GETRAENKEMINISTER && target.houseId !== session.houseId) return unauthorized(res);

  const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
  const pinRepeat = typeof req.body?.pinRepeat === "string" ? req.body.pinRepeat : "";
  if (!/^\d{4}$/.test(pin)) return badRequest(res, "PIN_INVALID");
  if (pin !== pinRepeat) return badRequest(res, "PIN_MISMATCH");
  const pinHash = await hashPin(pin);
  await prisma.user.update({ where: { id: userId }, data: { pinHash } });
  return json(res, 200, { ok: true });
}
