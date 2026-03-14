import { PrismaClient } from "@prisma/client";

import { runSeed } from "./run-seed.mjs";

async function main() {
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const admin = await prisma.user.findFirst({
      where: { name: { equals: "admin", mode: "insensitive" } },
      select: { id: true },
    });
    if (admin) {
      console.log("[seed] admin user exists; skipping seed");
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[seed] no admin user found; running seed");
  runSeed();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
