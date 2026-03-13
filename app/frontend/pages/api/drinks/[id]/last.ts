import type { NextApiRequest, NextApiResponse } from "next";
import { LogType } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { forbidden, json, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";
import { writeLog } from "@backend/services/logs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  const last = await prisma.drinkEntry.findFirst({
    where: { userId: session.id, deleted: false },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!last) return notFound(res);
  if (last.id !== id) return forbidden(res);

  await prisma.drinkEntry.update({ where: { id }, data: { deleted: true } });
  await writeLog({ type: LogType.DRINK_DELETED, userId: session.id, metadata: { drinkEntryId: id } });
  return json(res, 200, { ok: true });
}
