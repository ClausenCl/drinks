import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

type AnalyticsRow = {
  fridgeId: string;
  fridgeName: string;
  itemName: string;
  quantity: number;
  total: string;
  lastAt: Date;
};

function parseRangeDays(value: unknown) {
  const raw = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(raw) || raw < 0) return 30;
  return Math.min(raw, 3650);
}

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const rangeDays = parseRangeDays(req.query.rangeDays);
  const format = typeof req.query.format === "string" ? req.query.format : "json";
  const startAt = rangeDays === 0 ? null : new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  let allowedFridgeIds: string[] | null = null;
  if (session.role === UserRole.GETRAENKEMINISTER) {
    const perms = await prisma.ministerFridgePermission.findMany({
      where: { userId: session.id },
      select: { fridgeId: true },
    });
    if (perms.length === 0) return json(res, 200, []);
    allowedFridgeIds = perms.map((permission) => permission.fridgeId);
  }

  const startFilter = startAt ? Prisma.sql`AND de.created_at >= ${startAt}` : Prisma.empty;
  const houseFilter = session.role === UserRole.GETRAENKEMINISTER ? Prisma.sql`AND u.house_id = ${session.houseId}` : Prisma.empty;
  const fridgeFilter =
    allowedFridgeIds && allowedFridgeIds.length > 0
      ? Prisma.sql`AND de.fridge_id IN (${Prisma.join(allowedFridgeIds)})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<AnalyticsRow[]>`
    SELECT
      f.id AS "fridgeId",
      f.name AS "fridgeName",
      de.item_name_at_time AS "itemName",
      SUM(de.quantity)::int AS "quantity",
      SUM((de.quantity * de.price_at_time))::text AS "total",
      MAX(de.created_at) AS "lastAt"
    FROM drink_entries de
    JOIN fridges f ON f.id = de.fridge_id
    JOIN users u ON u.id = de.user_id
    WHERE de.deleted = false
      ${startFilter}
      ${houseFilter}
      ${fridgeFilter}
    GROUP BY f.id, f.name, de.item_name_at_time
    ORDER BY f.name ASC, SUM((de.quantity * de.price_at_time)) DESC, de.item_name_at_time ASC
  `;

  if (format === "csv") {
    const lines = [
      ["fridge", "item", "quantity", "total_eur", "last_entry_at"],
      ...rows.map((row) => [row.fridgeName, row.itemName, String(row.quantity), row.total, row.lastAt.toISOString()]),
    ];
    const csv = `${lines.map((line) => line.map((cell) => csvEscape(cell)).join(",")).join("\n")}\n`;
    const suffix = rangeDays === 0 ? "all" : `${rangeDays}d`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="fridge-item-analytics-${suffix}.csv"`);
    res.status(200).send(csv);
    return;
  }

  return json(
    res,
    200,
    rows.map((row) => ({
      fridgeId: row.fridgeId,
      fridgeName: row.fridgeName,
      itemName: row.itemName,
      quantity: row.quantity,
      total: row.total,
      lastAt: row.lastAt.toISOString(),
    }))
  );
}
