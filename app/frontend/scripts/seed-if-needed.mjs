import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

function resolveBin(cmd) {
  if (cmd.includes("/") || cmd.includes("\\") || cmd.startsWith(".")) return cmd;
  const ext = process.platform === "win32" ? ".cmd" : "";
  const candidate = path.join(process.cwd(), "node_modules", ".bin", `${cmd}${ext}`);
  return candidate;
}

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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const seedPath = path.resolve(__dirname, "../../../prisma/seed.ts");

  const tsx = resolveBin("tsx");
  const result = spawnSync(tsx, [seedPath], { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

