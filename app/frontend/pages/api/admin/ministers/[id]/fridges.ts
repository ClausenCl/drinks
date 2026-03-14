import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return unauthorized(res);

  const ministerId = typeof req.query.id === "string" ? req.query.id : "";
  if (!ministerId) return badRequest(res, "Missing minister id");

  if (req.method === "GET") {
    const perms = await prisma.ministerFridgePermission.findMany({
      where: { userId: ministerId },
      select: { fridgeId: true },
    });
    return json(res, 200, perms.map((p) => p.fridgeId));
  }

  if (req.method === "PUT") {
    const fridgeIds = Array.isArray(req.body?.fridgeIds)
      ? (req.body.fridgeIds as unknown[]).filter((x): x is string => typeof x === "string")
      : null;
    if (!fridgeIds) return badRequest(res, "Missing fridgeIds");

    const user = await prisma.user.findUnique({ where: { id: ministerId }, select: { id: true, role: true } });
    if (!user || user.role !== UserRole.GETRAENKEMINISTER) return badRequest(res, "Not a minister");

    await prisma.$transaction(async (tx) => {
      await tx.ministerFridgePermission.deleteMany({ where: { userId: ministerId } });
      const fridges = await tx.fridge.findMany({ where: { id: { in: fridgeIds }, active: true }, select: { id: true } });
      for (const f of fridges) {
        await tx.ministerFridgePermission.create({ data: { userId: ministerId, fridgeId: f.id } });
      }
    });

    return json(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}

