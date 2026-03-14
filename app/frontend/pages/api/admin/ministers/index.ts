import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { hashPassword } from "@backend/services/password";
import { getSessionUser } from "@backend/services/session";

function normalizeLoginName(input: string) {
  return input.trim().toLowerCase();
}

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return unauthorized(res);

  if (req.method === "GET") {
    const ministers = await prisma.user.findMany({
      where: { role: UserRole.GETRAENKEMINISTER, active: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, loginName: true, houseId: true, createdAt: true },
    });
    return json(
      res,
      200,
      ministers.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))
    );
  }

  if (req.method === "POST") {
    const loginNameRaw = typeof req.body?.loginName === "string" ? req.body.loginName : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const nameRaw = typeof req.body?.name === "string" ? req.body.name : "";
    const houseId = typeof req.body?.houseId === "string" ? req.body.houseId : "";
    const fridgeIds = Array.isArray(req.body?.fridgeIds) ? (req.body.fridgeIds as unknown[]).filter((x): x is string => typeof x === "string") : [];

    const loginName = normalizeLoginName(loginNameRaw);
    const name = normalizeName(nameRaw);
    if (!loginName || !password || !name || !houseId) return badRequest(res, "Missing fields");

    const existing = await prisma.user.findFirst({
      where: { loginName: { equals: loginName, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) return badRequest(res, "LOGIN_NAME_TAKEN");

    const house = await prisma.house.findUnique({ where: { id: houseId } });
    if (!house) return badRequest(res, "Unknown house");

    const pwHash = await hashPassword(password);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          loginName,
          passwordHash: pwHash,
          role: UserRole.GETRAENKEMINISTER,
          houseId,
          active: true,
        },
        select: { id: true, name: true, loginName: true, role: true, houseId: true, createdAt: true },
      });

      await tx.ministerProfile.create({ data: { userId: user.id, houseId } });

      if (fridgeIds.length > 0) {
        const fridges = await tx.fridge.findMany({
          where: { id: { in: fridgeIds }, active: true },
          select: { id: true },
        });
        for (const f of fridges) {
          await tx.ministerFridgePermission.create({ data: { userId: user.id, fridgeId: f.id } });
        }
      }

      return user;
    });

    return json(res, 201, { ...created, createdAt: created.createdAt.toISOString() });
  }

  return methodNotAllowed(res);
}

