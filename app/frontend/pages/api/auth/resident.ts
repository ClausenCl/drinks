import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { logAuthEvent } from "@backend/lib/observability";
import { enforceRateLimit, enforceSameOrigin } from "@backend/lib/security";
import { verifyPin } from "@backend/services/pin";
import { createSessionCookie } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, { bucket: "auth-resident", limit: 20, windowMs: 10 * 60 * 1000 })) return;

  const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
  const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
  if (!userId) {
    logAuthEvent(req, { flow: "resident-select", outcome: "failure", reason: "MISSING_USER_ID" });
    return badRequest(res, "Missing userId");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, houseId: true, active: true, pinHash: true, requirePinOnPurchase: true },
  });
  if (!user || !user.active) {
    logAuthEvent(req, { flow: "resident-select", outcome: "failure", reason: "USER_NOT_FOUND_OR_INACTIVE" });
    return unauthorized(res);
  }
  if (user.role !== UserRole.BEWOHNER) {
    logAuthEvent(req, { flow: "resident-select", outcome: "failure", reason: "ROLE_NOT_ALLOWED", userId: user.id, role: user.role });
    return unauthorized(res);
  }
  const askPinImmediately = user.requirePinOnPurchase;

  if (askPinImmediately) {
    if (!user.pinHash) {
      logAuthEvent(req, { flow: "resident-select", outcome: "failure", reason: "PIN_REQUIRED_SETUP", userId: user.id, role: user.role });
      return json(res, 401, { error: "PIN_REQUIRED_SETUP" });
    }
    if (!/^\d{4}$/.test(pin)) {
      logAuthEvent(req, { flow: "resident-select", outcome: "failure", reason: "PIN_INVALID", userId: user.id, role: user.role });
      return unauthorized(res);
    }
    const ok = await verifyPin(pin, user.pinHash);
    if (!ok) {
      logAuthEvent(req, { flow: "resident-select", outcome: "failure", reason: "PIN_MISMATCH", userId: user.id, role: user.role });
      return unauthorized(res);
    }
  }

  res.setHeader(
    "Set-Cookie",
    createSessionCookie({ id: user.id, name: user.name, role: user.role, houseId: user.houseId, pinVerified: askPinImmediately })
  );
  logAuthEvent(req, { flow: "resident-select", outcome: "success", userId: user.id, role: user.role });
  return json(res, 200, { id: user.id, name: user.name, role: user.role, houseId: user.houseId, pinVerified: askPinImmediately });
}
