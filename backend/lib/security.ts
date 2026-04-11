import type { NextApiRequest, NextApiResponse } from "next";
import { UserRole } from "@prisma/client";
import { forbidden, json, unauthorized } from "./http";
import { getSessionUser, type SessionUser } from "@backend/services/session";

const rateLimitStore = new Map<string, { hits: number; resetAt: number }>();

function getClientIp(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (forwardedValue) return forwardedValue.split(",")[0]?.trim() || "unknown";
  return req.socket.remoteAddress ?? "unknown";
}

export function requireResidentSession(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { requirePinVerified?: boolean } = {}
) {
  const session = getSessionUser(req);
  if (!session) {
    unauthorized(res);
    return null;
  }
  if (session.role !== UserRole.BEWOHNER) {
    unauthorized(res);
    return null;
  }
  if (options.requirePinVerified && session.pinVerified === false) {
    json(res, 403, { error: "PIN_REQUIRED" });
    return null;
  }
  return session;
}

export function requireSession(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) {
    unauthorized(res);
    return null;
  }
  return session;
}

export function requirePinVerifiedIfResident(req: NextApiRequest, res: NextApiResponse, session: SessionUser) {
  if (session.role === UserRole.BEWOHNER && session.pinVerified === false) {
    json(res, 403, { error: "PIN_REQUIRED" });
    return false;
  }
  return true;
}

export function enforceSameOrigin(req: NextApiRequest, res: NextApiResponse) {
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const originHeader = req.headers.origin;
  if (!originHeader) return true;

  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    forbidden(res);
    return false;
  }

  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const allowed = new Set<string>();
  if (host) {
    allowed.add(`http://${host}`);
    allowed.add(`https://${host}`);
  }

  const publicBaseUrl = process.env.PUBLIC_BASE_URL?.trim();
  if (publicBaseUrl) {
    try {
      const normalized = new URL(publicBaseUrl);
      allowed.add(`${normalized.protocol}//${normalized.host}`);
    } catch {
      // ignore malformed env value
    }
  }

  if (allowed.size === 0) return true;
  const candidate = `${origin.protocol}//${origin.host}`;
  if (!allowed.has(candidate)) {
    forbidden(res);
    return false;
  }
  return true;
}

export function enforceRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { bucket: string; limit: number; windowMs: number }
) {
  const now = Date.now();
  const key = `${options.bucket}:${getClientIp(req)}`;
  const current = rateLimitStore.get(key);
  const resetAt = current && current.resetAt > now ? current.resetAt : now + options.windowMs;
  const hits = current && current.resetAt > now ? current.hits : 0;
  const nextHits = hits + 1;
  rateLimitStore.set(key, { hits: nextHits, resetAt });

  const remaining = Math.max(0, options.limit - nextHits);
  res.setHeader("X-RateLimit-Limit", String(options.limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

  if (nextHits > options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    json(res, 429, { error: "RATE_LIMITED", retryAfterSeconds });
    return false;
  }

  if (rateLimitStore.size > 2000) {
    for (const [bucketKey, value] of rateLimitStore.entries()) {
      if (value.resetAt <= now) rateLimitStore.delete(bucketKey);
    }
  }

  return true;
}
