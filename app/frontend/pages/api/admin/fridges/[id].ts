import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const activeRaw = typeof req.body?.active === "boolean" ? (req.body.active as boolean) : undefined;

  const update: { name?: string; active?: boolean } = {};
  if (nameRaw) update.name = nameRaw;
  if (activeRaw !== undefined) update.active = activeRaw;
  if (Object.keys(update).length === 0) return badRequest(res, "No changes");

  if (update.name) {
    const hasHistory = await prisma.drinkEntry.findFirst({ where: { fridgeId: id }, select: { id: true } });
    if (hasHistory) return badRequest(res, "FRIDGE_HAS_HISTORY_RENAME_BLOCKED");
  }

  const updated = await prisma.fridge.update({
    where: { id },
    data: update,
    select: { id: true, name: true, active: true, _count: { select: { drinkEntries: true } } },
  });
  return json(res, 200, {
    id: updated.id,
    name: updated.name,
    active: updated.active,
    hasHistory: updated._count.drinkEntries > 0,
  });
}
