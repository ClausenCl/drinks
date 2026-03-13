import { spawn } from "node:child_process";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

function resolveBin(cmd) {
  if (cmd.includes("/") || cmd.includes("\\") || cmd.startsWith(".")) return cmd;
  const ext = process.platform === "win32" ? ".cmd" : "";
  const candidate = path.join(process.cwd(), "node_modules", ".bin", `${cmd}${ext}`);
  return candidate;
}

async function waitForDb({ timeoutMs = 60_000 } = {}) {
  const startedAt = Date.now();
  // Keep a single client for retries; Prisma caches some init work.
  const prisma = new PrismaClient();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await prisma.$connect();
      await prisma.$disconnect();
      return;
    } catch (err) {
      await prisma.$disconnect().catch(() => undefined);
      if (Date.now() - startedAt > timeoutMs) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

function runOrThrow(cmd, args) {
  const resolved = resolveBin(cmd);
  return new Promise((resolve, reject) => {
    const child = spawn(resolved, args, { stdio: "inherit", env: process.env });
    child.on("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(" ")} failed (${signal ?? code})`));
    });
  });
}

async function main() {
  const schemaPath = path.resolve(process.cwd(), "../../prisma/schema.prisma");

  console.log("[startup] waiting for database...");
  await waitForDb();

  console.log("[startup] applying migrations (prisma migrate deploy)...");
  await runOrThrow("prisma", ["migrate", "deploy", "--schema", schemaPath]);

  console.log("[startup] seeding (only if needed)...");
  await runOrThrow("node", ["scripts/seed-if-needed.mjs"]);

  console.log("[startup] starting next server...");
  await runOrThrow("npm", ["start"]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

