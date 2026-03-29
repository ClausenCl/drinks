import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { verifyPin } from "@backend/services/pin";
import { createSessionCookie } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);

  const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
  const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
  if (!userId) return badRequest(res, "Missing userId");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, houseId: true, active: true, pinHash: true, requirePinOnPurchase: true },
  });
  if (!user || !user.active) return unauthorized(res);
  if (user.role !== UserRole.BEWOHNER) return unauthorized(res);
  const askPinImmediately = user.requirePinOnPurchase;

  if (askPinImmediately) {
    if (!user.pinHash) return json(res, 401, { error: "PIN_REQUIRED_SETUP" });
    if (!/^\d{4}$/.test(pin)) return unauthorized(res);
    const ok = await verifyPin(pin, user.pinHash);
    if (!ok) return unauthorized(res);
  }

  res.setHeader(
    "Set-Cookie",
    createSessionCookie({ id: user.id, name: user.name, role: user.role, houseId: user.houseId, pinVerified: askPinImmediately })
  );
  return json(res, 200, { id: user.id, name: user.name, role: user.role, houseId: user.houseId, pinVerified: askPinImmediately });
}
