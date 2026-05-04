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
      resolve({ ok: false, reason: error instanceof Error ? error.message : "SPAWN_ERROR" });
    });
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve({ ok: true, reason: null });
        return;
      }
      resolve({ ok: false, reason: `backup-email exit=${signal ?? code}` });
    });
  });
}

async function sendFailureAlert(message) {
  const webhookUrl = process.env.BACKUP_ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;
  const authToken = process.env.BACKUP_ALERT_WEBHOOK_AUTH?.trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        ts: new Date().toISOString(),
        service: "drinks-backup-loop",
        level: "error",
        message,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error(`[backup-loop] alert webhook failed: ${res.status}`);
    } else {
      console.log("[backup-loop] failure alert sent");
    }
  } catch (error) {
    console.error("[backup-loop] failure alert error", error);
  }
}

async function main() {
  const initialDelaySeconds = envInt("BACKUP_INITIAL_DELAY_SECONDS", 45);
  const intervalSeconds = Math.max(300, envInt("BACKUP_INTERVAL_SECONDS", 60 * 60 * 24));
  console.log(`[backup-loop] initial delay ${initialDelaySeconds}s`);
  await sleep(initialDelaySeconds * 1000);

  while (true) {
    const result = await runBackupOnce();
    if (!result.ok) {
      const message = `Backup run failed: ${result.reason ?? "UNKNOWN_ERROR"}`;
      console.error(`[backup-loop] ${message}`);
      await sendFailureAlert(message);
    }
    console.log(`[backup-loop] sleeping ${intervalSeconds}s`);
    await sleep(intervalSeconds * 1000);
  }
}

main().catch((error) => {
  console.error(error);
  void sendFailureAlert(`Backup loop crashed: ${error instanceof Error ? error.message : "UNKNOWN_ERROR"}`);
  process.exit(1);
});
