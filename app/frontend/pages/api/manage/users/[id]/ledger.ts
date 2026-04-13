import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { centsToDecimal, decimalToCents } from "@backend/lib/money";
import { getSessionUser } from "@backend/services/session";

function parsePositiveInt(input: unknown, fallback: number, max: number) {
  const n = typeof input === "string" ? Number.parseInt(input, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const userId = typeof req.query.id === "string" ? req.query.id : "";
  if (!userId) return badRequest(res, "Missing userId");

  const take = parsePositiveInt(req.query.take, 200, 500);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      houseId: true,
      active: true,
      requirePinOnPurchase: true,
      createdAt: true,
      updatedAt: true,
      house: { select: { id: true, name: true, color: true } },
    },
  });
  if (!target || target.role !== UserRole.BEWOHNER) return badRequest(res, "Unknown resident");
  if (session.role === UserRole.GETRAENKEMINISTER && target.houseId !== session.houseId) return unauthorized(res);

  const [drinks, billShares, manualCharges, fridges] = await Promise.all([
    prisma.drinkEntry.findMany({
      where: { userId, deleted: false },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        quantity: true,
        priceAtTime: true,
        billedInId: true,
        itemNameAtTime: true,
        fridge: { select: { id: true, name: true } },
      },
    }),
    prisma.billParticipant.findMany({
      where: { userId },
      orderBy: { bill: { createdAt: "desc" } },
      take,
      select: {
        id: true,
        shareAmount: true,
        billedInId: true,
        bill: { select: { id: true, title: true, createdAt: true } },
      },
    }),
    prisma.manualCharge.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        amount: true,
        createdAt: true,
        billedInId: true,
      },
    }),
    prisma.fridge.findMany({
      where:
        session.role === UserRole.ADMIN
          ? { active: true }
          : {
              active: true,
              ministerPermissions: { some: { userId: session.id } },
            },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        fridgeItems: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, price: true },
        },
      },
    }),
  ]);

  let drinksCents = 0;
  const drinkRows = drinks.map((entry) => {
    const totalCents = decimalToCents(entry.priceAtTime.toFixed(2)) * entry.quantity;
    drinksCents += totalCents;
    return {
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      quantity: entry.quantity,
      unitPrice: entry.priceAtTime.toFixed(2),
      total: centsToDecimal(totalCents),
      billed: Boolean(entry.billedInId),
      fridge: entry.fridge,
      itemName: entry.itemNameAtTime,
    };
  });

  let billShareCents = 0;
  const billRows = billShares.map((part) => {
    const cents = decimalToCents(part.shareAmount.toFixed(2));
    billShareCents += cents;
    return {
      id: part.id,
      billId: part.bill.id,
      title: part.bill.title,
      createdAt: part.bill.createdAt.toISOString(),
      shareAmount: part.shareAmount.toFixed(2),
      billed: Boolean(part.billedInId),
    };
  });

  let manualCents = 0;
  const manualRows = manualCharges.map((charge) => {
    const cents = decimalToCents(charge.amount.toFixed(2));
    manualCents += cents;
    return {
      id: charge.id,
      title: charge.title,
      amount: charge.amount.toFixed(2),
      createdAt: charge.createdAt.toISOString(),
      billed: Boolean(charge.billedInId),
    };
  });

  const openDrinkCents = drinkRows.filter((row) => !row.billed).reduce((sum, row) => sum + decimalToCents(row.total), 0);
  const openBillShareCents = billRows.filter((row) => !row.billed).reduce((sum, row) => sum + decimalToCents(row.shareAmount), 0);
  const openManualCents = manualRows.filter((row) => !row.billed).reduce((sum, row) => sum + decimalToCents(row.amount), 0);

  return json(res, 200, {
    user: {
      id: target.id,
      name: target.name,
      active: target.active,
      houseId: target.houseId,
      house: target.house,
      requirePinOnPurchase: target.requirePinOnPurchase,
      createdAt: target.createdAt.toISOString(),
      updatedAt: target.updatedAt.toISOString(),
    },
    summary: {
      drinksTotal: centsToDecimal(drinksCents),
      billSharesTotal: centsToDecimal(billShareCents),
      manualChargesTotal: centsToDecimal(manualCents),
      unbilledTotal: centsToDecimal(openDrinkCents + openBillShareCents + openManualCents),
    },
    drinks: drinkRows,
    billShares: billRows,
    manualCharges: manualRows,
    drinkOptions: fridges.map((fridge) => ({
      id: fridge.id,
      name: fridge.name,
      items: fridge.fridgeItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price.toFixed(2),
      })),
    })),
  });
}
