import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, forbidden, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);

  if (req.method === "GET") {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const includeInactive = req.query.includeInactive === "true" && session.role === UserRole.ADMIN;
    const products = await prisma.product.findMany({
      where: {
        ...(includeInactive ? {} : { active: true }),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, price: true, active: true, createdAt: true },
    });
    return json(
      res,
      200,
      products.map((product) => ({
        ...product,
        price: product.price.toFixed(2),
        createdAt: product.createdAt.toISOString(),
      }))
    );
  }

  if (req.method === "POST") {
    if (session.role !== UserRole.ADMIN) return forbidden(res);
    const name = normalizeName(typeof req.body?.name === "string" ? req.body.name : "");
    const priceRaw = typeof req.body?.price === "string" ? req.body.price.trim() : "";
    const active = typeof req.body?.active === "boolean" ? req.body.active : true;
    if (!name || !priceRaw) return badRequest(res, "Missing name or price");

    const parsed = Number(priceRaw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return badRequest(res, "Invalid price");

    const existing = await prisma.product.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) return badRequest(res, "PRODUCT_EXISTS");

    const created = await prisma.product.create({
      data: { name, price: parsed.toFixed(2), active },
      select: { id: true, name: true, price: true, active: true, createdAt: true },
    });
    return json(res, 201, {
      ...created,
      price: created.price.toFixed(2),
      createdAt: created.createdAt.toISOString(),
    });
  }

  return methodNotAllowed(res);
}
