import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

function isHexColor(input: string) {
  return /^#[0-9a-fA-F]{6}$/.test(input);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  if (req.method === "PATCH") {
    const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const colorRaw = typeof req.body?.color === "string" ? req.body.color.trim() : "";
    const update: { name?: string; color?: string } = {};

    if (nameRaw) update.name = nameRaw;
    if (colorRaw) {
      if (!isHexColor(colorRaw)) return badRequest(res, "INVALID_COLOR");
      update.color = colorRaw;
    }
    if (Object.keys(update).length === 0) return badRequest(res, "No changes");

    if (update.name) {
      const existing = await prisma.house.findFirst({
        where: { name: { equals: update.name, mode: "insensitive" }, NOT: { id } },
        select: { id: true },
      });
      if (existing) return badRequest(res, "HOUSE_EXISTS");
    }

    const updated = await prisma.house.update({
      where: { id },
      data: update,
      select: { id: true, name: true, color: true },
    });
    return json(res, 200, updated);
  }

  if (req.method === "DELETE") {
    const house = await prisma.house.findUnique({
      where: { id },
      select: { id: true, _count: { select: { users: true, billingRuns: true, manualCharges: true } } },
    });
    if (!house) return notFound(res);
    const used = house._count.users > 0 || house._count.billingRuns > 0 || house._count.manualCharges > 0;
    if (used) return badRequest(res, "HOUSE_NOT_EMPTY");

    await prisma.house.delete({ where: { id } });
    return json(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}

