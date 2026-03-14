import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { decimalToCents } from "@backend/lib/money";
import { getSessionUser } from "@backend/services/session";
import { writeBillingPdf, type BillingPdfUserRow } from "@backend/services/billing-pdf";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  if (req.method === "GET") {
    const runs = await prisma.billingRun.findMany({
      where: session.role === UserRole.ADMIN ? {} : { houseId: session.houseId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, houseId: true, title: true, createdAt: true, pdfPath: true, house: { select: { name: true } } },
    });
    return json(
      res,
      200,
      runs.map((r) => ({
        id: r.id,
        houseId: r.houseId,
        houseName: r.house.name,
        title: r.title,
        createdAt: r.createdAt.toISOString(),
        hasPdf: Boolean(r.pdfPath),
      }))
    );
  }

  if (req.method === "POST") {
    const houseId = typeof req.body?.houseId === "string" ? req.body.houseId : "";
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!houseId || !title) return badRequest(res, "Missing houseId or title");
    if (session.role === UserRole.GETRAENKEMINISTER && houseId !== session.houseId) return unauthorized(res);

    const house = await prisma.house.findUnique({ where: { id: houseId } });
    if (!house) return badRequest(res, "Unknown house");

    const carryovers =
      req.body?.carryovers && typeof req.body.carryovers === "object" ? (req.body.carryovers as Record<string, string>) : {};

    // Snapshot uninvoiced data first (so PDF reflects exactly what gets invoiced).
    const [drinkEntries, billParts, charges] = await Promise.all([
      prisma.drinkEntry.findMany({
        where: { billedInId: null, deleted: false, user: { houseId } },
        select: { userId: true, quantity: true, priceAtTime: true, fridge: { select: { name: true } }, user: { select: { name: true } } },
      }),
      prisma.billParticipant.findMany({
        where: { billedInId: null, user: { houseId } },
        select: { userId: true, shareAmount: true, user: { select: { name: true } } },
      }),
      prisma.manualCharge.findMany({
        where: { billedInId: null, houseId },
        select: { userId: true, amount: true, user: { select: { name: true } } },
      }),
    ]);

    const byUser: Record<string, BillingPdfUserRow> = {};
    const ensureUser = (userId: string, userName: string) => {
      byUser[userId] ??= {
        userId,
        userName,
        perFridge: [],
        eventBillsCents: 0,
        manualChargesCents: 0,
        carryoverCents: 0,
        grandTotalCents: 0,
      };
      return byUser[userId];
    };

    const perUserFridge: Record<string, Record<string, number>> = {};
    for (const e of drinkEntries) {
      const cents = decimalToCents(e.priceAtTime.toFixed(2)) * e.quantity;
      const row = ensureUser(e.userId, e.user.name);
      (perUserFridge[e.userId] ??= {});
      perUserFridge[e.userId][e.fridge.name] = (perUserFridge[e.userId][e.fridge.name] ?? 0) + cents;
      ensureUser(e.userId, e.user.name);
    }
    for (const [userId, fr] of Object.entries(perUserFridge)) {
      const row = byUser[userId]!;
      row.perFridge = Object.entries(fr).map(([fridgeName, totalCents]) => ({ fridgeName, totalCents }));
    }

    for (const p of billParts) {
      const row = ensureUser(p.userId, p.user.name);
      row.eventBillsCents += decimalToCents(p.shareAmount.toFixed(2));
    }
    for (const c of charges) {
      const row = ensureUser(c.userId, c.user.name);
      row.manualChargesCents += decimalToCents(c.amount.toFixed(2));
    }

    for (const row of Object.values(byUser)) {
      const raw = carryovers[row.userId] ?? "0";
      row.carryoverCents = decimalToCents(String(raw));
      const drinksCents = row.perFridge.reduce((acc, x) => acc + x.totalCents, 0);
      row.grandTotalCents = drinksCents + row.eventBillsCents + row.manualChargesCents + row.carryoverCents;
    }

    const created = await prisma.$transaction(async (tx) => {
      const run = await tx.billingRun.create({
        data: { houseId, createdByUserId: session.id, title },
        select: { id: true, houseId: true, title: true, createdAt: true },
      });

      await tx.drinkEntry.updateMany({
        where: { billedInId: null, deleted: false, user: { houseId } },
        data: { billedInId: run.id },
      });
      await tx.billParticipant.updateMany({
        where: { billedInId: null, user: { houseId } },
        data: { billedInId: run.id },
      });
      await tx.manualCharge.updateMany({
        where: { billedInId: null, houseId },
        data: { billedInId: run.id },
      });

      return run;
    });

    // Write PDF to disk and attach to run.
    const outDir = process.env.BILLING_PDF_DIR || "/repo/app/frontend/storage/billing";
    const fileName = `${created.createdAt.toISOString().slice(0, 10)}_${created.id}.pdf`;
    const outPath = await writeBillingPdf({
      outDir,
      fileName,
      title: created.title,
      houseName: house.name,
      createdAtIso: created.createdAt.toISOString(),
      rows: Object.values(byUser),
    });

    await prisma.billingRun.update({ where: { id: created.id }, data: { pdfPath: outPath } });

    return json(res, 201, { ...created, createdAt: created.createdAt.toISOString(), hasPdf: true });
  }

  return methodNotAllowed(res);
}
