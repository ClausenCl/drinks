import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { enforceRateLimit, enforceSameOrigin, requireResidentSession } from "@backend/lib/security";
import { hashPin, verifyPin } from "@backend/services/pin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, { bucket: "resident-pin-settings", limit: 15, windowMs: 10 * 60 * 1000 })) return;
  const session = requireResidentSession(req, res, { requirePinVerified: true });
  if (!session) return;

  const currentPin = typeof req.body?.currentPin === "string" ? req.body.currentPin : "";
  const action = typeof req.body?.action === "string" ? req.body.action : "changePin";
  const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
  const pinRepeat = typeof req.body?.pinRepeat === "string" ? req.body.pinRepeat : "";

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, houseId: true, pinHash: true, requirePinOnPurchase: true },
  });
  if (!user) return unauthorized(res);
  if (!user.pinHash) return badRequest(res, "PIN_REQUIRED_SETUP");
  if (!/^\d{4}$/.test(currentPin)) return badRequest(res, "CURRENT_PIN_INVALID");

  const currentPinOk = await verifyPin(currentPin, user.pinHash);
  if (!currentPinOk) return badRequest(res, "CURRENT_PIN_INVALID");

  if (action === "setPurchaseRequirement" || action === "updateSecurity") {
    const requirePinOnPurchase = typeof req.body?.requirePinOnPurchase === "boolean" ? req.body.requirePinOnPurchase : null;
    if (requirePinOnPurchase === null) return badRequest(res, "Missing requirePinOnPurchase");

    const updateData: { requirePinOnPurchase: boolean; pinHash?: string } = { requirePinOnPurchase };
    if (action === "updateSecurity" && (pin || pinRepeat)) {
      if (!/^\d{4}$/.test(pin)) return badRequest(res, "PIN_INVALID");
      if (pin !== pinRepeat) return badRequest(res, "PIN_MISMATCH");
      updateData.pinHash = await hashPin(pin);
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: { id: true, name: true, houseId: true, requirePinOnPurchase: true },
    });
    return json(res, 200, updated);
  }

  if (action !== "changePin") return badRequest(res, "Unsupported action");

  if (!/^\d{4}$/.test(pin)) return badRequest(res, "PIN_INVALID");
  if (pin !== pinRepeat) return badRequest(res, "PIN_MISMATCH");
  const pinHash = await hashPin(pin);

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: { pinHash },
    select: { id: true, name: true, houseId: true, requirePinOnPurchase: true },
  });
  return json(res, 200, updated);
}
