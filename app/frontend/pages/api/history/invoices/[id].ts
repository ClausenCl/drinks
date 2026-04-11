import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, notFound } from "@backend/lib/http";
import { centsToDecimal, decimalToCents } from "@backend/lib/money";
import { requireResidentSession } from "@backend/lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const session = requireResidentSession(req, res, { requirePinVerified: true });
  if (!session) return;

  const runId = typeof req.query.id === "string" ? req.query.id : "";
  if (!runId) return notFound(res);

  const run = await prisma.billingRun.findUnique({
    where: { id: runId },
    select: { id: true, title: true, createdAt: true },
  });
  if (!run) return notFound(res);

  const [drinks, billShares, charges] = await Promise.all([
    prisma.drinkEntry.findMany({
      where: { userId: session.id, billedInId: runId, deleted: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, quantity: true, itemNameAtTime: true, priceAtTime: true, fridge: { select: { name: true } } },
    }),
    prisma.billParticipant.findMany({
      where: { userId: session.id, billedInId: runId },
      orderBy: { bill: { createdAt: "asc" } },
      select: { id: true, shareAmount: true, bill: { select: { id: true, title: true, createdAt: true } } },
    }),
    prisma.manualCharge.findMany({
      where: { userId: session.id, billedInId: runId },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, amount: true, createdAt: true },
    }),
  ]);

  if (drinks.length === 0 && billShares.length === 0 && charges.length === 0) return notFound(res);

  let totalCents = 0;

  const drinkRows = drinks.map((drink) => {
    const total = decimalToCents(drink.priceAtTime.toFixed(2)) * drink.quantity;
    totalCents += total;
    return {
      id: drink.id,
      createdAt: drink.createdAt.toISOString(),
      fridgeName: drink.fridge.name,
      itemName: drink.itemNameAtTime,
      quantity: drink.quantity,
      unitPrice: drink.priceAtTime.toFixed(2),
      total: centsToDecimal(total),
    };
  });

  const billRows = billShares.map((billShare) => {
    const total = decimalToCents(billShare.shareAmount.toFixed(2));
    totalCents += total;
    return {
      id: billShare.id,
      billId: billShare.bill.id,
      title: billShare.bill.title,
      createdAt: billShare.bill.createdAt.toISOString(),
      total: centsToDecimal(total),
    };
  });

  const chargeRows = charges.map((charge) => {
    const total = decimalToCents(charge.amount.toFixed(2));
    totalCents += total;
    return {
      id: charge.id,
      title: charge.title,
      createdAt: charge.createdAt.toISOString(),
      total: centsToDecimal(total),
    };
  });

  return json(res, 200, {
    id: run.id,
    title: run.title,
    createdAt: run.createdAt.toISOString(),
    total: centsToDecimal(totalCents),
    drinks: drinkRows,
    eventBills: billRows,
    manualCharges: chargeRows,
  });
}
