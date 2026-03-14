import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

type Row = {
  fridgeId: string;
  fridgeName: string;
  productId: string;
  productName: string;
  quantity: number;
  total: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  let allowedFridgeIds: string[] | null = null;
  if (session.role === UserRole.GETRAENKEMINISTER) {
    const perms = await prisma.ministerFridgePermission.findMany({
      where: { userId: session.id },
      select: { fridgeId: true },
    });
    if (perms.length === 0) return json(res, 200, []);
    allowedFridgeIds = perms.map((p) => p.fridgeId);
  }

  const fridgeFilter =
    allowedFridgeIds && allowedFridgeIds.length > 0
      ? Prisma.sql`AND de.fridge_id IN (${Prisma.join(allowedFridgeIds)})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      f.id AS "fridgeId",
      f.name AS "fridgeName",
      p.id AS "productId",
      p.name AS "productName",
      SUM(de.quantity)::int AS "quantity",
      SUM((de.quantity * de.price_at_time))::text AS "total"
    FROM drink_entries de
    JOIN fridges f ON f.id = de.fridge_id
    JOIN products p ON p.id = de.product_id
    WHERE de.deleted = false
      AND de.billed_in_id IS NULL
      ${fridgeFilter}
    GROUP BY f.id, f.name, p.id, p.name
    ORDER BY f.name ASC, p.name ASC
  `;

  return json(res, 200, rows);
}
