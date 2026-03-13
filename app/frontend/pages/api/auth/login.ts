import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { verifyPassword } from "@backend/services/password";
import { createSessionCookie } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!name || !password) return badRequest(res, "Missing name or password");

  const user = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (!user || !user.active) return unauthorized(res);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return unauthorized(res);

  res.setHeader(
    "Set-Cookie",
    createSessionCookie({ id: user.id, name: user.name, role: user.role, houseId: user.houseId })
  );
  return json(res, 200, { id: user.id, name: user.name, role: user.role, houseId: user.houseId });
}
