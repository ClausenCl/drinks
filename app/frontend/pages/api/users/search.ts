import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed } from "@backend/lib/http";
import { requirePinVerifiedIfResident, requireSession } from "@backend/lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = requireSession(req, res);
  if (!session) return;
  if (!requirePinVerifiedIfResident(req, res, session)) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return json(res, 200, []);

  const users = await prisma.user.findMany({
    where: {
      role: UserRole.BEWOHNER,
      active: true,
      name: { contains: q, mode: "insensitive" },
    },
    take: 20,
    orderBy: { name: "asc" },
    select: { id: true, name: true, house: { select: { id: true, name: true } } },
  });

  return json(res, 200, users.map((u) => ({ id: u.id, name: u.name, houseId: u.house.id, houseName: u.house.name })));
}
