import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs";
import path from "node:path";
import { UserRole } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { methodNotAllowed, notFound, unauthorized } from "@backend/lib/http";
import { getSessionUser } from "@backend/services/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSessionUser(req);
  if (!session) return unauthorized(res);
  if (session.role === UserRole.BEWOHNER) return unauthorized(res);

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return notFound(res);

  const run = await prisma.billingRun.findUnique({
    where: { id },
    select: { id: true, houseId: true, pdfPath: true, title: true },
  });
  if (!run || !run.pdfPath) return notFound(res);
  if (session.role === UserRole.GETRAENKEMINISTER && run.houseId !== session.houseId) return unauthorized(res);

  const safePath = path.resolve(run.pdfPath);
  if (!fs.existsSync(safePath)) return notFound(res);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=\"billing-${run.id}.pdf\"`);
  const stream = fs.createReadStream(safePath);
  stream.pipe(res);
}

