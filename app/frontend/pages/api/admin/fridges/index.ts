import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return unauthorized(res);

  if (req.method === "GET") {
    const fridges = await prisma.fridge.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, locationDescription: true, active: true, _count: { select: { drinkEntries: true } } },
    });
    return json(
      res,
      200,
      fridges.map((f) => ({
        id: f.id,
        name: f.name,
        locationDescription: f.locationDescription,
        active: f.active,
        hasHistory: f._count.drinkEntries > 0,
      }))
    );
  }

  if (req.method === "POST") {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const locationDescription = typeof req.body?.locationDescription === "string" ? req.body.locationDescription.trim() : "";
    if (!name) return badRequest(res, "Missing name");
    if (!locationDescription) return badRequest(res, "Missing locationDescription");
    const created = await prisma.fridge.create({
      data: { name, locationDescription, active: true },
      select: { id: true, name: true, locationDescription: true, active: true },
    });
    return json(res, 201, { ...created, hasHistory: false });
  }

  return methodNotAllowed(res);
}
