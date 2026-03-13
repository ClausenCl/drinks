import { LogType } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function writeLog(params: { type: LogType; userId: string; metadata: unknown }) {
  return prisma.log.create({
    data: {
      type: params.type,
      userId: params.userId,
      metadata: params.metadata as any,
    },
  });
}

