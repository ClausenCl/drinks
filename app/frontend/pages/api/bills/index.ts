import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { enforceSameOrigin, requirePinVerifiedIfResident, requireSession } from "@backend/lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireSession(req, res);
  if (!session) return;

  if (req.method === "POST") {
    if (!enforceSameOrigin(req, res)) return;
    if (session.role !== UserRole.BEWOHNER) return unauthorized(res);
    if (!requirePinVerifiedIfResident(req, res, session)) return;

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const totalRaw = typeof req.body?.totalAmount === "string" ? req.body.totalAmount.trim() : "";
    const paidByUserId = typeof req.body?.paidByUserId === "string" ? (req.body.paidByUserId as string) : session.id;
    const participantIds = Array.isArray(req.body?.participantIds)
      ? (req.body.participantIds as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    if (!title) return badRequest(res, "Missing title");
    const total = Number(totalRaw.replace(",", "."));
    if (!Number.isFinite(total) || total <= 0) return badRequest(res, "Invalid totalAmount");

    const uniqParticipants = Array.from(new Set(participantIds));
    if (!uniqParticipants.includes(paidByUserId)) uniqParticipants.push(paidByUserId);
    if (uniqParticipants.length < 1) return badRequest(res, "No participants");

    const users = await prisma.user.findMany({
      where: { id: { in: uniqParticipants }, role: UserRole.BEWOHNER, active: true },
      select: { id: true },
    });
    if (users.length !== uniqParticipants.length) return badRequest(res, "Unknown participant");

    const n = uniqParticipants.length;
    const share = total / n;
    const shares = uniqParticipants.map((uid) => ({
      userId: uid,
      shareAmount: uid === paidByUserId ? -(total - share) : share,
    }));

    const created = await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          createdByUserId: session.id,
          paidByUserId,
          title,
          totalAmount: total.toFixed(2),
          participants: {
            create: shares.map((s) => ({
              userId: s.userId,
              shareAmount: s.shareAmount.toFixed(2),
            })),
          },
        },
        select: { id: true, title: true, totalAmount: true, createdAt: true, paidByUserId: true },
      });
      return bill;
    });

    return json(res, 201, {
      id: created.id,
      title: created.title,
      totalAmount: created.totalAmount.toFixed(2),
      createdAt: created.createdAt.toISOString(),
      paidByUserId: created.paidByUserId,
    });
  }

  if (req.method === "GET") {
    // Admin/minister overview. Ministers only see bills that include participants from their house.
    if (session.role === UserRole.BEWOHNER) return unauthorized(res);

    const where =
      session.role === UserRole.GETRAENKEMINISTER
        ? { participants: { some: { user: { houseId: session.houseId } } } }
        : {};

    const bills = await prisma.bill.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        totalAmount: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, house: { select: { id: true, name: true } } } },
        paidBy: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });

    return json(
      res,
      200,
      bills.map((b) => ({
        id: b.id,
        title: b.title,
        totalAmount: b.totalAmount.toFixed(2),
        createdAt: b.createdAt.toISOString(),
        createdBy: { ...b.createdBy, house: b.createdBy.house },
        paidBy: b.paidBy,
        participantsCount: b._count.participants,
      }))
    );
  }

  return methodNotAllowed(res);
}
