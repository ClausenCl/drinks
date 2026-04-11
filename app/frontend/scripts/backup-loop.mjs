import { spawn } from "node:child_process";
import path from "node:path";

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runBackupOnce() {
  const script = path.resolve(process.cwd(), "scripts/backup-email.mjs");
  return new Promise((resolve) => {
    const child = spawn("node", [script], { stdio: "inherit", env: process.env });
    child.on("error", (error) => {
      console.error(error);
      resolve();
    });
    child.on("exit", () => resolve());
  });
}

async function main() {
  const initialDelaySeconds = envInt("BACKUP_INITIAL_DELAY_SECONDS", 45);
  const intervalSeconds = Math.max(300, envInt("BACKUP_INTERVAL_SECONDS", 60 * 60 * 24));
  console.log(`[backup-loop] initial delay ${initialDelaySeconds}s`);
  await sleep(initialDelaySeconds * 1000);

  while (true) {
    await runBackupOnce();
    console.log(`[backup-loop] sleeping ${intervalSeconds}s`);
    await sleep(intervalSeconds * 1000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
