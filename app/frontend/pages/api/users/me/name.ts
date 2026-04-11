import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed } from "@backend/lib/http";
import { enforceSameOrigin, requireResidentSession } from "@backend/lib/security";

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;
  const session = requireResidentSession(req, res, { requirePinVerified: true });
  if (!session) return;

  const nameRaw = typeof req.body?.name === "string" ? req.body.name : "";
  const name = normalizeName(nameRaw);
  if (!name) return badRequest(res, "Missing name");

  const existing = await prisma.user.findFirst({
    where: { houseId: session.houseId, role: UserRole.BEWOHNER, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing && existing.id !== session.id) return badRequest(res, "NAME_EXISTS_IN_HOUSE");

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: { name },
    select: { id: true, name: true, role: true, houseId: true },
  });
  return json(res, 200, updated);
}
