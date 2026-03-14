import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);

  const houseId = typeof req.body?.houseId === "string" ? req.body.houseId : "";
  if (!houseId) return badRequest(res, "Missing houseId");

  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house) return badRequest(res, "Unknown house");

  const me = await prisma.user.findUnique({ where: { id: session.id }, select: { name: true, role: true } });
  if (!me) return unauthorized(res);
  if (me.role !== UserRole.BEWOHNER) return unauthorized(res);

  const collision = await prisma.user.findFirst({
    where: { houseId, role: UserRole.BEWOHNER, name: { equals: me.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (collision && collision.id !== session.id) return badRequest(res, "NAME_EXISTS_IN_HOUSE");

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: { houseId },
    select: { id: true, name: true, role: true, houseId: true },
  });

  return json(res, 200, updated);
}
