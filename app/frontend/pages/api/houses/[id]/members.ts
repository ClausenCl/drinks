import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed } from "@backend/lib/http";
import { hashPin } from "@backend/services/pin";

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const houseId = typeof req.query.id === "string" ? req.query.id : "";
  if (!houseId) return badRequest(res, "Missing houseId");

  if (req.method === "GET") {
    const members = await prisma.user.findMany({
      where: { houseId, role: UserRole.BEWOHNER, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, pinHash: true },
    });
    return json(
      res,
      200,
      members.map((m) => ({ id: m.id, name: m.name, hasPin: Boolean(m.pinHash) }))
    );
  }

  if (req.method === "POST") {
    const nameRaw = typeof req.body?.name === "string" ? req.body.name : "";
    const name = normalizeName(nameRaw);
    const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
    const pinRepeat = typeof req.body?.pinRepeat === "string" ? req.body.pinRepeat : "";
    if (!name) return badRequest(res, "Missing name");

    const house = await prisma.house.findUnique({ where: { id: houseId } });
    if (!house) return badRequest(res, "Unknown house");

    const existing = await prisma.user.findFirst({
      where: { houseId, role: UserRole.BEWOHNER, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) return badRequest(res, "NAME_EXISTS_IN_HOUSE");

    let pinHash: string | null = null;
    if (pin || pinRepeat) {
      if (!/^\d{4}$/.test(pin)) return badRequest(res, "PIN_INVALID");
      if (pin !== pinRepeat) return badRequest(res, "PIN_MISMATCH");
      pinHash = await hashPin(pin);
    }

    const created = await prisma.user.create({
      data: {
        name,
        role: UserRole.BEWOHNER,
        houseId,
        passwordHash: null,
        pinHash,
        active: true,
      },
      select: { id: true, name: true, houseId: true },
    });
    return json(res, 201, created);
  }

  return methodNotAllowed(res);
}

