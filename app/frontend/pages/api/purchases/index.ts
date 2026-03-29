import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import crypto from "crypto";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { verifyPin } from "@backend/services/pin";
import { getSessionUser } from "@backend/services/session";
import { writeLog } from "@backend/services/logs";

type Item = { productId: string; quantity: number };

function isValidQuantity(x: unknown): x is number {
  return Number.isInteger(x) && (x as number) >= 1 && (x as number) <= 99;
}

function parseItem(input: unknown): { productId: string; quantity: unknown } {
  if (!input || typeof input !== "object") return { productId: "", quantity: undefined };
  const record = input as Record<string, unknown>;
  const productId = typeof record.productId === "string" ? record.productId : "";
  return { productId, quantity: record.quantity };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.BEWOHNER) return unauthorized(res);

  const fridgeId = typeof req.body?.fridgeId === "string" ? req.body.fridgeId : "";
  const purchasePin = typeof req.body?.pin === "string" ? req.body.pin : "";
  const itemsRaw = Array.isArray(req.body?.items) ? (req.body.items as unknown[]) : [];
  if (!fridgeId) return badRequest(res, "Missing fridgeId");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true, active: true, pinHash: true, requirePinOnPurchase: true },
  });
  if (!currentUser || !currentUser.active || currentUser.role !== UserRole.BEWOHNER) return unauthorized(res);

  if (currentUser.requirePinOnPurchase) {
    if (!currentUser.pinHash) return badRequest(res, "PIN_REQUIRED_SETUP");
    if (!/^\d{4}$/.test(purchasePin)) return badRequest(res, "PIN_INVALID");
    const pinOk = await verifyPin(purchasePin, currentUser.pinHash);
    if (!pinOk) return badRequest(res, "PIN_INVALID");
  }

  const items: Item[] = itemsRaw
    .map(parseItem)
    .filter((it) => it.productId && isValidQuantity(it.quantity))
    .map((it) => ({ productId: it.productId, quantity: it.quantity as number }));

  if (items.length === 0) return badRequest(res, "No items");

  const fridge = await prisma.fridge.findUnique({ where: { id: fridgeId } });
  if (!fridge || !fridge.active) return badRequest(res, "Unknown fridge");

  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const [products, fps] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, active: true } }),
    prisma.fridgeProduct.findMany({ where: { fridgeId, productId: { in: productIds } }, select: { productId: true } }),
  ]);

  const allowed = new Set(fps.map((fp) => fp.productId));
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const it of items) {
    if (!allowed.has(it.productId)) return badRequest(res, "Product not available in this fridge");
    if (!byId.has(it.productId)) return badRequest(res, "Unknown product");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30_000);
  const token = crypto.randomBytes(32).toString("base64url");

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: { userId: session.id, fridgeId },
      select: { id: true, createdAt: true },
    });

    for (const it of items) {
      const product = byId.get(it.productId)!;
      await tx.drinkEntry.create({
        data: {
          userId: session.id,
          fridgeId,
          productId: it.productId,
          quantity: it.quantity,
          priceAtTime: product.price,
          purchaseId: created.id,
        },
      });
    }

    await tx.purchaseUndoToken.create({
      data: {
        token,
        purchaseId: created.id,
        userId: session.id,
        expiresAt,
      },
    });

    return created;
  });

  await writeLog({
    type: LogType.DRINK_ADDED,
    userId: session.id,
    metadata: { purchaseId: purchase.id, fridgeId, items },
  });

  const summary = items.map((it) => {
    const product = byId.get(it.productId)!;
    return { productId: it.productId, name: product.name, quantity: it.quantity, price: product.price.toFixed(2) };
  });

  return json(res, 200, {
    purchaseId: purchase.id,
    createdAt: purchase.createdAt.toISOString(),
    undoToken: token,
    undoExpiresAt: expiresAt.toISOString(),
    summary,
  });
}
