import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { enforceSameOrigin } from "@backend/lib/security";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;

  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const userId = typeof req.query.id === "string" ? req.query.id : "";
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const amountRaw = typeof req.body?.amount === "string" ? req.body.amount.trim() : "";
  if (!userId || !title || !amountRaw) return badRequest(res, "Missing fields");

  const amount = Number(amountRaw.replace(",", "."));
  if (!Number.isFinite(amount) || amount === 0) return badRequest(res, "Invalid amount");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, houseId: true, active: true },
  });
  if (!target || !target.active || target.role !== UserRole.BEWOHNER) return badRequest(res, "Unknown resident");
  if (session.role === UserRole.GETRAENKEMINISTER && target.houseId !== session.houseId) return unauthorized(res);

  const created = await prisma.manualCharge.create({
    data: {
      houseId: target.houseId,
      userId: target.id,
      createdByUserId: session.id,
      title,
      amount: amount.toFixed(2),
    },
    select: { id: true, title: true, amount: true, createdAt: true, billedInId: true },
  });

  return json(res, 201, {
    id: created.id,
    title: created.title,
    amount: created.amount.toFixed(2),
    createdAt: created.createdAt.toISOString(),
    billed: Boolean(created.billedInId),
  });
}
