import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);

  const fridges = await prisma.fridge.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return json(res, 200, fridges);
}
