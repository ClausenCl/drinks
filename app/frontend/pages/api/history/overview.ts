import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed } from "@backend/lib/http";
import { centsToDecimal, decimalToCents } from "@backend/lib/money";
import { requireResidentSession } from "@backend/lib/security";

type InvoiceSummary = { id: string; title: string; createdAt: string; total: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = requireResidentSession(req, res, { requirePinVerified: true });
  if (!session) return;

  const [openDrinks, openBillShares, openCharges, billedDrinks, billedBillShares, billedCharges] = await Promise.all([
    prisma.drinkEntry.findMany({
      where: { userId: session.id, billedInId: null, deleted: false },
      select: { quantity: true, priceAtTime: true },
    }),
    prisma.billParticipant.findMany({
      where: { userId: session.id, billedInId: null },
      select: { shareAmount: true },
    }),
    prisma.manualCharge.findMany({
      where: { userId: session.id, billedInId: null },
      select: { amount: true },
    }),
    prisma.drinkEntry.findMany({
      where: { userId: session.id, billedInId: { not: null }, deleted: false },
      select: {
        quantity: true,
        priceAtTime: true,
        billedIn: { select: { id: true, title: true, createdAt: true } },
      },
    }),
    prisma.billParticipant.findMany({
      where: { userId: session.id, billedInId: { not: null } },
      select: {
        shareAmount: true,
        billedIn: { select: { id: true, title: true, createdAt: true } },
      },
    }),
    prisma.manualCharge.findMany({
      where: { userId: session.id, billedInId: { not: null } },
      select: {
        amount: true,
        billedIn: { select: { id: true, title: true, createdAt: true } },
      },
    }),
  ]);

  let unbilledCents = 0;
  for (const drink of openDrinks) {
    unbilledCents += decimalToCents(drink.priceAtTime.toFixed(2)) * drink.quantity;
  }
  for (const billShare of openBillShares) {
    unbilledCents += decimalToCents(billShare.shareAmount.toFixed(2));
  }
  for (const charge of openCharges) {
    unbilledCents += decimalToCents(charge.amount.toFixed(2));
  }

  const invoicesById = new Map<string, { id: string; title: string; createdAt: Date; totalCents: number }>();

  for (const drink of billedDrinks) {
    if (!drink.billedIn) continue;
    const current = invoicesById.get(drink.billedIn.id) ?? {
      id: drink.billedIn.id,
      title: drink.billedIn.title,
      createdAt: drink.billedIn.createdAt,
      totalCents: 0,
    };
    current.totalCents += decimalToCents(drink.priceAtTime.toFixed(2)) * drink.quantity;
    invoicesById.set(current.id, current);
  }

  for (const billShare of billedBillShares) {
    if (!billShare.billedIn) continue;
    const current = invoicesById.get(billShare.billedIn.id) ?? {
      id: billShare.billedIn.id,
      title: billShare.billedIn.title,
      createdAt: billShare.billedIn.createdAt,
      totalCents: 0,
    };
    current.totalCents += decimalToCents(billShare.shareAmount.toFixed(2));
    invoicesById.set(current.id, current);
  }

  for (const charge of billedCharges) {
    if (!charge.billedIn) continue;
    const current = invoicesById.get(charge.billedIn.id) ?? {
      id: charge.billedIn.id,
      title: charge.billedIn.title,
      createdAt: charge.billedIn.createdAt,
      totalCents: 0,
    };
    current.totalCents += decimalToCents(charge.amount.toFixed(2));
    invoicesById.set(current.id, current);
  }

  const invoices: InvoiceSummary[] = Array.from(invoicesById.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((invoice) => ({
      id: invoice.id,
      title: invoice.title,
      createdAt: invoice.createdAt.toISOString(),
      total: centsToDecimal(invoice.totalCents),
    }));

  return json(res, 200, {
    unbilledTotal: centsToDecimal(unbilledCents),
    invoices,
  });
}
