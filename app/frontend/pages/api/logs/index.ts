import type { NextApiRequest, NextApiResponse } from "next";
import { LogType, UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, forbidden, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
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
  if (session.role !== UserRole.ADMIN) return forbidden(res);

  const typeRaw = typeof req.query.type === "string" ? req.query.type : "";
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  const houseId = typeof req.query.houseId === "string" ? req.query.houseId : "";
  const take = parsePositiveInt(req.query.take, 200, 500);

  const type = typeRaw
    ? typeRaw === LogType.DRINK_ADDED ||
      typeRaw === LogType.DRINK_DELETED ||
      typeRaw === LogType.USER_DELETED ||
      typeRaw === LogType.PRICE_CHANGED
      ? typeRaw
      : null
    : "";
  if (type === null) return badRequest(res, "Invalid log type");

  const logs = await prisma.log.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(userId ? { userId } : {}),
      ...(houseId ? { user: { houseId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      userId: true,
      metadata: true,
      createdAt: true,
      user: { select: { name: true, role: true, house: { select: { id: true, name: true } } } },
    },
  });

  return json(
    res,
    200,
    logs.map((log) => ({
      id: log.id,
      type: log.type,
      userId: log.userId,
      userName: log.user.name,
      userRole: log.user.role,
      userHouse: log.user.house,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }))
  );
}
