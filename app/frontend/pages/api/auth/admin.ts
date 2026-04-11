import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { enforceRateLimit, enforceSameOrigin } from "@backend/lib/security";
import { verifyPassword } from "@backend/services/password";
import { createSessionCookie } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, { bucket: "auth-admin", limit: 10, windowMs: 10 * 60 * 1000 })) return;
  const loginName = typeof req.body?.loginName === "string" ? req.body.loginName.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!loginName || !password) return badRequest(res, "Missing loginName or password");

  const user = await prisma.user.findFirst({
    where: { loginName: { equals: loginName, mode: "insensitive" } },
  });

  if (!user || !user.active) return unauthorized(res);
  if (user.role === UserRole.BEWOHNER) return unauthorized(res);
  if (!user.passwordHash) return unauthorized(res);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return unauthorized(res);

  res.setHeader(
    "Set-Cookie",
    createSessionCookie({ id: user.id, name: user.name, role: user.role, houseId: user.houseId })
  );
  return json(res, 200, { id: user.id, name: user.name, role: user.role, houseId: user.houseId });
}
