import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed } from "@backend/lib/http";
import { requireResidentSession } from "@backend/lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = requireResidentSession(req, res, { requirePinVerified: true });
  if (!session) return;

  const billed = typeof req.query.billed === "string" ? req.query.billed : "all";
  const billedWhere =
    billed === "unbilled" ? { billedInId: null } : billed === "billed" ? { billedInId: { not: null } } : {};

  const items = await prisma.manualCharge.findMany({
    where: { userId: session.id, ...billedWhere },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, amount: true, createdAt: true, billedInId: true },
  });

  return json(
    res,
    200,
    items.map((c) => ({
      id: c.id,
      title: c.title,
      amount: c.amount.toFixed(2),
      createdAt: c.createdAt.toISOString(),
      billed: Boolean(c.billedInId),
    }))
  );
}
