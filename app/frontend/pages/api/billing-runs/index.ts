import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  if (req.method === "GET") {
    const runs = await prisma.billingRun.findMany({
      where: session.role === UserRole.ADMIN ? {} : { houseId: session.houseId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, houseId: true, title: true, createdAt: true },
    });
    return json(res, 200, runs.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  }

  if (req.method === "POST") {
    const houseId = typeof req.body?.houseId === "string" ? req.body.houseId : "";
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!houseId || !title) return badRequest(res, "Missing houseId or title");
    if (session.role === UserRole.GETRAENKEMINISTER && houseId !== session.houseId) return unauthorized(res);

    const house = await prisma.house.findUnique({ where: { id: houseId } });
    if (!house) return badRequest(res, "Unknown house");

    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.billingRun.create({
        data: { houseId, createdByUserId: session.id, title },
        select: { id: true, houseId: true, title: true, createdAt: true },
      });

      await tx.drinkEntry.updateMany({
        where: { billedInId: null, deleted: false, user: { houseId } },
        data: { billedInId: created.id },
      });

      return created;
    });

    return json(res, 201, { ...run, createdAt: run.createdAt.toISOString() });
  }

  return methodNotAllowed(res);
}

