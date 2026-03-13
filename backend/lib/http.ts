import type { NextApiResponse } from "next";

export function json(res: NextApiResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export function methodNotAllowed(res: NextApiResponse) {
  return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
}

export function unauthorized(res: NextApiResponse) {
  return json(res, 401, { error: "UNAUTHORIZED" });
}

export function forbidden(res: NextApiResponse) {
  return json(res, 403, { error: "FORBIDDEN" });
}

export function notFound(res: NextApiResponse) {
  return json(res, 404, { error: "NOT_FOUND" });
}

export function badRequest(res: NextApiResponse, message?: string) {
  return json(res, 400, { error: "BAD_REQUEST", message });
}

export function notImplemented(res: NextApiResponse) {
  return json(res, 501, { error: "NOT_IMPLEMENTED" });
}
