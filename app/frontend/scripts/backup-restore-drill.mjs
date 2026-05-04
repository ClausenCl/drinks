import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value == null) return fallback;
  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
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

async function findLatestDump(backupDir) {
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".dump")).map((entry) => entry.name).sort();
  return files.length > 0 ? path.join(backupDir, files[files.length - 1]) : null;
}

async function main() {
  const restoreDbUrl = process.env.BACKUP_RESTORE_TEST_DB_URL?.trim();
  if (!restoreDbUrl) throw new Error("BACKUP_RESTORE_TEST_DB_URL is required");

  const backupDir = process.env.BACKUP_DIR?.trim() || "/repo/app/frontend/storage/backups";
  const explicitDump = process.env.BACKUP_RESTORE_FILE?.trim();
  const dumpFile = explicitDump || (await findLatestDump(backupDir));
  if (!dumpFile) throw new Error(`No .dump file found in ${backupDir}`);

  const resetSchema = envFlag("BACKUP_RESTORE_RESET_SCHEMA", true);

  console.log(`[restore-drill] using dump: ${dumpFile}`);
  if (resetSchema) {
    console.log("[restore-drill] resetting public schema on test database");
    await runOrThrow("psql", [restoreDbUrl, "-v", "ON_ERROR_STOP=1", "-c", "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"]);
  }

  console.log("[restore-drill] restoring backup into test database");
  await runOrThrow("pg_restore", ["--dbname", restoreDbUrl, "--clean", "--if-exists", "--no-owner", "--no-privileges", dumpFile]);

  console.log("[restore-drill] running sanity checks");
  await runOrThrow("psql", [restoreDbUrl, "-v", "ON_ERROR_STOP=1", "-c", "SELECT count(*) AS users_count FROM users;"]);
  await runOrThrow("psql", [restoreDbUrl, "-v", "ON_ERROR_STOP=1", "-c", "SELECT count(*) AS fridges_count FROM fridges;"]);
  await runOrThrow("psql", [restoreDbUrl, "-v", "ON_ERROR_STOP=1", "-c", "SELECT count(*) AS drinks_count FROM drink_entries;"]);

  console.log("[restore-drill] ✅ success");
  console.log("[restore-drill] Checklist:");
  console.log("- record run date");
  console.log("- record dump filename");
  console.log("- record user/fridge/drink counts");
  console.log("- sign off in ops checklist");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
