import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function parseDotenv(contents) {
  const env = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice("export ".length) : line;
    const eq = withoutExport.indexOf("=");
    if (eq <= 0) continue;
    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnvFiles() {
  const cwd = process.cwd();
  const filesInOrder = [path.join(cwd, ".env"), path.join(cwd, ".env.local")];

  const keysSetByEnvFiles = new Set();
  for (const filePath of filesInOrder) {
    if (!existsSync(filePath)) continue;
    const parsed = parseDotenv(readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] !== undefined && !keysSetByEnvFiles.has(key)) continue; // shell/CI wins
      process.env[key] = String(value);
      keysSetByEnvFiles.add(key);
    }
  }
}

function resolveBin(cmd) {
  if (cmd.includes("/") || cmd.includes("\\") || cmd.startsWith(".")) return cmd;
  const ext = process.platform === "win32" ? ".cmd" : "";
  const candidate = path.join(process.cwd(), "node_modules", ".bin", `${cmd}${ext}`);
  return existsSync(candidate) ? candidate : cmd;
}

function main() {
  loadEnvFiles();

  const [, , cmd, ...args] = process.argv;
  if (!cmd) {
    console.error("Usage: node scripts/with-env.mjs <cmd> [...args]");
    process.exit(2);
  }

  const resolved = resolveBin(cmd);
  const child = spawn(resolved, args, { stdio: "inherit", env: process.env });
  child.on("exit", (code, signal) => {
    if (typeof code === "number") process.exit(code);
    process.exit(signal ? 1 : 0);
  });
}

main();

