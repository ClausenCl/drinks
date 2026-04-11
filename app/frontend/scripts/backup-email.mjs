import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import nodemailer from "nodemailer";

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value == null) return fallback;
  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  return value;
}

function runOrThrow(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} ${args.join(" ")} failed (${signal ?? code})`));
    });
  });
}

function nowStamp() {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}_${pad(now.getUTCHours())}-${pad(now.getUTCMinutes())}-${pad(now.getUTCSeconds())}Z`;
}

async function pruneOldBackups(backupDir, retentionDays) {
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".dump")) continue;
    const filePath = path.join(backupDir, entry.name);
    const stat = await fs.stat(filePath);
    if (stat.mtimeMs < threshold) {
      await fs.rm(filePath, { force: true });
      console.log(`[backup] removed old dump ${entry.name}`);
    }
  }
}

async function sendBackupEmail(filePath, fileName) {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = envInt("SMTP_PORT", 587);
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const backupEmailTo = process.env.BACKUP_EMAIL_TO?.trim();
  const backupEmailFrom = process.env.BACKUP_EMAIL_FROM?.trim();

  if (!smtpHost || !smtpUser || !smtpPass || !backupEmailTo || !backupEmailFrom) {
    console.log("[backup] SMTP or backup email config incomplete; skipping email send");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: backupEmailFrom,
    to: backupEmailTo,
    subject: `[Drinks Backup] ${fileName}`,
    text: `Attached: ${fileName}`,
    attachments: [{ filename: fileName, path: filePath }],
  });
  console.log("[backup] email sent");
}

async function main() {
  const backupEnabled = envFlag("BACKUP_ENABLED", true);
  if (!backupEnabled) {
    console.log("[backup] disabled by BACKUP_ENABLED");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const backupDir = process.env.BACKUP_DIR?.trim() || "/repo/app/frontend/storage/backups";
  const retentionDays = Math.max(1, envInt("BACKUP_RETENTION_DAYS", 14));

  await fs.mkdir(backupDir, { recursive: true });
  const fileName = `drinks-${nowStamp()}.dump`;
  const filePath = path.join(backupDir, fileName);

  console.log(`[backup] creating dump ${fileName}`);
  await runOrThrow("pg_dump", [
    "--dbname",
    databaseUrl,
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    filePath,
  ]);

  await pruneOldBackups(backupDir, retentionDays);
  await sendBackupEmail(filePath, fileName);
  console.log("[backup] completed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
