import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  if (req.method === "POST") {
    const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const amountRaw = typeof req.body?.amount === "string" ? req.body.amount.trim() : "";
    if (!userId || !title || !amountRaw) return badRequest(res, "Missing fields");

    const amount = Number(amountRaw.replace(",", "."));
    if (!Number.isFinite(amount) || amount === 0) return badRequest(res, "Invalid amount");

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, houseId: true, active: true } });
    if (!user || !user.active || user.role !== UserRole.BEWOHNER) return badRequest(res, "Unknown user");
    if (session.role === UserRole.GETRAENKEMINISTER && user.houseId !== session.houseId) return unauthorized(res);

    const created = await prisma.manualCharge.create({
      data: {
        houseId: user.houseId,
        userId: user.id,
        createdByUserId: session.id,
        title,
        amount: amount.toFixed(2),
      },
      select: { id: true, title: true, amount: true, createdAt: true, userId: true, houseId: true },
    });

    return json(res, 201, { ...created, amount: created.amount.toFixed(2), createdAt: created.createdAt.toISOString() });
  }

  if (req.method === "GET") {
    const items = await prisma.manualCharge.findMany({
      where: session.role === UserRole.ADMIN ? {} : { houseId: session.houseId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, amount: true, createdAt: true, user: { select: { name: true } }, billedInId: true },
    });
    return json(
      res,
      200,
      items.map((c) => ({
        id: c.id,
        title: c.title,
        amount: c.amount.toFixed(2),
        createdAt: c.createdAt.toISOString(),
        userName: c.user.name,
        billed: Boolean(c.billedInId),
      }))
    );
  }

  return methodNotAllowed(res);
}

