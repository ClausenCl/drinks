import type { NextApiRequest } from "next";
import { UserRole } from "@prisma/client";
import crypto from "crypto";
import * as cookie from "cookie";

const COOKIE_NAME = "drinks_session";

type SessionPayload = {
  id: string;
  name: string;
  role: UserRole;
  houseId: string;
  pinVerified: boolean;
  exp: number;
};

function shouldUseSecureCookie() {
  const raw = process.env.SESSION_COOKIE_SECURE;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return process.env.NODE_ENV === "production";
}

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(data: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionCookie(payload: Omit<SessionPayload, "exp" | "pinVerified"> & { pinVerified?: boolean }, ttlSeconds = 60 * 60 * 24 * 14) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const json = JSON.stringify({ ...payload, pinVerified: payload.pinVerified ?? true, exp } satisfies SessionPayload);
  const data = base64UrlEncode(json);
  const sig = sign(data);
  const value = `${data}.${sig}`;

  return cookie.serialize(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: ttlSeconds,
  });
}

export function clearSessionCookie() {
  return cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: 0,
  });
}

export function getSessionUser(req: NextApiRequest) {
  const header = req.headers.cookie;
  if (!header) return null;
  const parsed = cookie.parse(header);
  const raw = parsed[COOKIE_NAME];
  if (!raw) return null;
  const [data, sig] = raw.split(".");
  if (!data || !sig) return null;
  if (sign(data) !== sig) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(data)) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!payload.id || !payload.houseId || !payload.name) return null;
  return { id: payload.id, name: payload.name, role: payload.role, houseId: payload.houseId, pinVerified: payload.pinVerified ?? true };
}
