import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { logAuthEvent } from "@backend/lib/observability";
import { enforceRateLimit, enforceSameOrigin } from "@backend/lib/security";
import { verifyPin } from "@backend/services/pin";
import { createSessionCookie, getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, { bucket: "auth-resident-verify", limit: 10, windowMs: 5 * 60 * 1000 })) return;

  const session = getSessionUser(req);
  if (!session) {
    logAuthEvent(req, { flow: "resident-verify", outcome: "failure", reason: "NO_SESSION" });
    return unauthorized(res);
  }
  if (session.role !== UserRole.BEWOHNER) {
    logAuthEvent(req, { flow: "resident-verify", outcome: "failure", reason: "ROLE_NOT_ALLOWED", userId: session.id, role: session.role });
    return unauthorized(res);
  }

  const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
  if (!/^\d{4}$/.test(pin)) {
    logAuthEvent(req, { flow: "resident-verify", outcome: "failure", reason: "PIN_INVALID", userId: session.id, role: session.role });
    return badRequest(res, "PIN_INVALID");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, role: true, houseId: true, active: true, pinHash: true },
  });
  if (!user || !user.active || user.role !== UserRole.BEWOHNER) {
    logAuthEvent(req, { flow: "resident-verify", outcome: "failure", reason: "USER_NOT_FOUND_OR_INACTIVE", userId: session.id, role: session.role });
    return unauthorized(res);
  }
  if (!user.pinHash) {
    logAuthEvent(req, { flow: "resident-verify", outcome: "failure", reason: "PIN_REQUIRED_SETUP", userId: user.id, role: user.role });
    return badRequest(res, "PIN_REQUIRED_SETUP");
  }

  const ok = await verifyPin(pin, user.pinHash);
  if (!ok) {
    logAuthEvent(req, { flow: "resident-verify", outcome: "failure", reason: "PIN_MISMATCH", userId: user.id, role: user.role });
    return badRequest(res, "PIN_INVALID");
  }

  res.setHeader(
    "Set-Cookie",
    createSessionCookie({ id: user.id, name: user.name, role: user.role, houseId: user.houseId, pinVerified: true })
  );

  logAuthEvent(req, { flow: "resident-verify", outcome: "success", userId: user.id, role: user.role });
  return json(res, 200, { ok: true, pinVerified: true });
}
