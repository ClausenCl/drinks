import type { NextApiRequest } from "next";

type AuthEventParams = {
  flow: "admin" | "resident-select" | "resident-verify" | "legacy-login";
  outcome: "success" | "failure" | "rate_limited";
  reason?: string;
  userId?: string;
  role?: string;
  bucket?: string;
};

function getClientIp(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (forwardedValue) return forwardedValue.split(",")[0]?.trim() || "unknown";
  return req.socket.remoteAddress ?? "unknown";
}

export function logAuthEvent(req: NextApiRequest, params: AuthEventParams) {
  const route = req.url?.split("?")[0] ?? "unknown";
  const payload = {
    ts: new Date().toISOString(),
    kind: "auth_event",
    route,
    flow: params.flow,
    outcome: params.outcome,
    reason: params.reason ?? null,
    userId: params.userId ?? null,
    role: params.role ?? null,
    rateLimitBucket: params.bucket ?? null,
    ip: getClientIp(req),
  };
  console.info(JSON.stringify(payload));
}
