import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { badRequest, json, methodNotAllowed, unauthorized } from "@backend/lib/http";
import { logAuthEvent } from "@backend/lib/observability";
import { enforceRateLimit, enforceSameOrigin } from "@backend/lib/security";
import { verifyPassword } from "@backend/services/password";
import { createSessionCookie } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!enforceSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, { bucket: "auth-admin", limit: 10, windowMs: 10 * 60 * 1000 })) return;
  const loginName = typeof req.body?.loginName === "string" ? req.body.loginName.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!loginName || !password) {
    logAuthEvent(req, { flow: "admin", outcome: "failure", reason: "MISSING_FIELDS" });
    return badRequest(res, "Missing loginName or password");
  }

  const user = await prisma.user.findFirst({
    where: { loginName: { equals: loginName, mode: "insensitive" } },
  });

  if (!user || !user.active) {
    logAuthEvent(req, { flow: "admin", outcome: "failure", reason: "USER_NOT_FOUND_OR_INACTIVE" });
    return unauthorized(res);
  }
  if (user.role === UserRole.BEWOHNER) {
    logAuthEvent(req, { flow: "admin", outcome: "failure", reason: "ROLE_NOT_ALLOWED", userId: user.id, role: user.role });
    return unauthorized(res);
  }
  if (!user.passwordHash) {
    logAuthEvent(req, { flow: "admin", outcome: "failure", reason: "NO_PASSWORD_HASH", userId: user.id, role: user.role });
    return unauthorized(res);
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    logAuthEvent(req, { flow: "admin", outcome: "failure", reason: "INVALID_PASSWORD", userId: user.id, role: user.role });
    return unauthorized(res);
  }

  res.setHeader(
    "Set-Cookie",
    createSessionCookie({ id: user.id, name: user.name, role: user.role, houseId: user.houseId })
  );
  logAuthEvent(req, { flow: "admin", outcome: "success", userId: user.id, role: user.role });
  return json(res, 200, { id: user.id, name: user.name, role: user.role, houseId: user.houseId });
}
