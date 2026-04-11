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

  const parts = await prisma.billParticipant.findMany({
    where: { userId: session.id, ...billedWhere },
    orderBy: { bill: { createdAt: "desc" } },
    take: 50,
    select: {
      id: true,
      shareAmount: true,
      billedInId: true,
      bill: { select: { id: true, title: true, totalAmount: true, createdAt: true, paidByUserId: true } },
    },
  });

  return json(
    res,
    200,
    parts.map((p) => ({
      id: p.id,
      billId: p.bill.id,
      title: p.bill.title,
      createdAt: p.bill.createdAt.toISOString(),
      totalAmount: p.bill.totalAmount.toFixed(2),
      shareAmount: p.shareAmount.toFixed(2),
      paidByUserId: p.bill.paidByUserId,
      billed: Boolean(p.billedInId),
    }))
  );
}
