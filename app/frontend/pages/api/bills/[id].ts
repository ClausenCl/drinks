import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, notFound } from "@backend/lib/http";
import { requirePinVerifiedIfResident, requireSession } from "@backend/lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const session = requireSession(req, res);
  if (!session) return;
  if (!requirePinVerifiedIfResident(req, res, session)) return;

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  const where =
    session.role === UserRole.ADMIN
      ? { id }
      : session.role === UserRole.GETRAENKEMINISTER
        ? { id, participants: { some: { user: { houseId: session.houseId } } } }
        : { id, participants: { some: { userId: session.id } } };

  const bill = await prisma.bill.findFirst({
    where,
    select: {
      id: true,
      title: true,
      totalAmount: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, house: { select: { id: true, name: true } } } },
      paidBy: { select: { id: true, name: true } },
      participants: {
        select: {
          id: true,
          shareAmount: true,
          user: { select: { id: true, name: true, house: { select: { id: true, name: true } } } },
        },
        orderBy: [{ user: { house: { name: "asc" } } }, { user: { name: "asc" } }],
      },
    },
  });
  if (!bill) return notFound(res);

  return json(res, 200, {
    id: bill.id,
    title: bill.title,
    totalAmount: bill.totalAmount.toFixed(2),
    createdAt: bill.createdAt.toISOString(),
    createdBy: bill.createdBy,
    paidBy: bill.paidBy,
    participants: bill.participants.map((participant) => ({
      id: participant.id,
      shareAmount: participant.shareAmount.toFixed(2),
      user: participant.user,
    })),
  });
}
