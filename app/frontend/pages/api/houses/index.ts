import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const houses = await prisma.house.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return json(res, 200, houses);
  }

  if (req.method === "POST") {
    const session = getSessionUser(req);
    if (!session) return unauthorized(res);
    if (session.role !== UserRole.ADMIN) return unauthorized(res);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) return badRequest(res, "Missing name");
    const existing = await prisma.house.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
    if (existing) return badRequest(res, "HOUSE_EXISTS");
    const created = await prisma.house.create({ data: { name }, select: { id: true, name: true } });
    return json(res, 201, created);
  }

  return methodNotAllowed(res);
}
