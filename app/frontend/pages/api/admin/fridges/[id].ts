import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role !== UserRole.ADMIN) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  if (req.method === "GET") {
    const fridge = await prisma.fridge.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        active: true,
        _count: { select: { drinkEntries: true } },
        ministerPermissions: { select: { userId: true } },
      },
    });
    if (!fridge) return notFound(res);

    return json(res, 200, {
      id: fridge.id,
      name: fridge.name,
      active: fridge.active,
      hasHistory: fridge._count.drinkEntries > 0,
      managerIds: fridge.ministerPermissions.map((permission) => permission.userId),
    });
  }

  if (req.method !== "PATCH") return methodNotAllowed(res);

  const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const activeRaw = typeof req.body?.active === "boolean" ? (req.body.active as boolean) : undefined;
  const managerIdsRaw = Array.isArray(req.body?.managerIds)
    ? (req.body.managerIds as unknown[]).filter((value): value is string => typeof value === "string")
    : undefined;
  const managerIds = managerIdsRaw ? Array.from(new Set(managerIdsRaw)) : undefined;

  const update: { name?: string; active?: boolean } = {};
  if (nameRaw) update.name = nameRaw;
  if (activeRaw !== undefined) update.active = activeRaw;
  if (Object.keys(update).length === 0 && managerIds === undefined) return badRequest(res, "No changes");

  if (update.name) {
    const hasHistory = await prisma.drinkEntry.findFirst({ where: { fridgeId: id }, select: { id: true } });
    if (hasHistory) return badRequest(res, "FRIDGE_HAS_HISTORY_RENAME_BLOCKED");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const fridge = await tx.fridge.update({
      where: { id },
      data: update,
      select: { id: true, name: true, active: true, _count: { select: { drinkEntries: true } } },
    });

    if (managerIds !== undefined) {
      await tx.ministerFridgePermission.deleteMany({ where: { fridgeId: id } });
      const managers = await tx.user.findMany({
        where: { id: { in: managerIds }, role: UserRole.GETRAENKEMINISTER, active: true },
        select: { id: true },
      });
      for (const manager of managers) {
        await tx.ministerFridgePermission.create({
          data: { userId: manager.id, fridgeId: id },
        });
      }
    }

    const permissions = await tx.ministerFridgePermission.findMany({
      where: { fridgeId: id },
      select: { userId: true },
    });

    return { fridge, managerIds: permissions.map((permission) => permission.userId) };
  });

  return json(res, 200, {
    id: updated.fridge.id,
    name: updated.fridge.name,
    active: updated.fridge.active,
    hasHistory: updated.fridge._count.drinkEntries > 0,
    managerIds: updated.managerIds,
  });
}
