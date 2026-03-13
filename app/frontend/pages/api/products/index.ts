import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { forbidden, json, methodNotAllowed, notImplemented, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);

  if (req.method === "GET") {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, active: true, createdAt: true },
    });
    return json(res, 200, products.map((p) => ({ ...p, price: p.price.toFixed(2) })));
  }

  if (req.method === "POST") {
    if (session.role !== UserRole.ADMIN) return forbidden(res);
    return notImplemented(res);
  }

  return methodNotAllowed(res);
}
