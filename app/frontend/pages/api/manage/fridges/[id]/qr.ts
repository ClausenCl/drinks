import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import QRCode from "qrcode";
import { prisma } from "@backend/lib/prisma";
import { forbidden, methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

async function ministerCanAccessFridge(userId: string, fridgeId: string) {
  const perms = await prisma.ministerFridgePermission.findMany({ where: { userId }, select: { fridgeId: true } });
  if (perms.length === 0) return false;
  return perms.some((permission) => permission.fridgeId === fridgeId);
}

function resolvePublicBaseUrl(req: NextApiRequest) {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const forwardedHost = req.headers["x-forwarded-host"];
  const hostHeader = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers.host;
  if (!hostHeader) return "http://localhost:3000";
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(",")[0]?.trim() || "http";
  return `${proto}://${hostHeader}`.replace(/\/+$/, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  if (session.role === UserRole.GETRAENKEMINISTER) {
    const permitted = await ministerCanAccessFridge(session.id, id);
    if (!permitted) return forbidden(res);
  }

  const fridge = await prisma.fridge.findUnique({
    where: { id },
    select: { id: true, name: true, active: true },
  });
  if (!fridge || !fridge.active) return notFound(res);

  const url = `${resolvePublicBaseUrl(req)}/fridge/${fridge.id}`;
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#111827", light: "#ffffff" },
  });

  const download = req.query.download === "1";
  const safeName = fridge.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "fridge";
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename=\"qr-${safeName}.png\"`);
  res.status(200).send(png);
}
