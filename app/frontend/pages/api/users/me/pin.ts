import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";
import { hashPin } from "@backend/services/pin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.BEWOHNER) return unauthorized(res);

  const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
  const pinRepeat = typeof req.body?.pinRepeat === "string" ? req.body.pinRepeat : "";
  const mode = typeof req.body?.mode === "string" ? req.body.mode : "set";

  if (mode === "disable") {
    const updated = await prisma.user.update({
      where: { id: session.id },
      data: { pinHash: null },
      select: { id: true, name: true, houseId: true },
    });
    return json(res, 200, { ...updated, hasPin: false });
  }

  if (!/^\d{4}$/.test(pin)) return badRequest(res, "PIN_INVALID");
  if (pin !== pinRepeat) return badRequest(res, "PIN_MISMATCH");
  const pinHash = await hashPin(pin);

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: { pinHash },
    select: { id: true, name: true, houseId: true },
  });
  return json(res, 200, { ...updated, hasPin: true });
}

