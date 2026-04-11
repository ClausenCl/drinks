import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
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

  const roleRaw = typeof req.query.role === "string" ? req.query.role : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const houseId = typeof req.query.houseId === "string" ? req.query.houseId : "";
  const includeInactive = req.query.includeInactive === "true";
  const take = parsePositiveInt(req.query.take, 100, 300);

  const role = roleRaw
    ? roleRaw === UserRole.ADMIN || roleRaw === UserRole.GETRAENKEMINISTER || roleRaw === UserRole.BEWOHNER
      ? roleRaw
      : null
    : "";
  if (role === null) return badRequest(res, "Invalid role");

  const users = await prisma.user.findMany({
    where: {
      ...(includeInactive ? {} : { active: true }),
      ...(role ? { role } : {}),
      ...(houseId ? { houseId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { loginName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    take,
    select: {
      id: true,
      name: true,
      loginName: true,
      role: true,
      houseId: true,
      active: true,
      requirePinOnPurchase: true,
      createdAt: true,
      updatedAt: true,
      house: { select: { id: true, name: true, color: true } },
    },
  });

  return json(
    res,
    200,
    users.map((user) => ({
      id: user.id,
      name: user.name,
      loginName: user.loginName,
      role: user.role,
      houseId: user.houseId,
      house: user.house,
      active: user.active,
      requirePinOnPurchase: user.requirePinOnPurchase,
      hasLogin: Boolean(user.loginName),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }))
  );
}
