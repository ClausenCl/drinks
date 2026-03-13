import type { NextApiRequest, NextApiResponse } from "next";
import { json, methodNotAllowed } from "@backend/lib/http";
import { clearSessionCookie } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  res.setHeader("Set-Cookie", clearSessionCookie());
  return json(res, 200, { ok: true });
}
