import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function resolveBin(cmd) {
  if (cmd.includes("/") || cmd.includes("\\") || cmd.startsWith(".")) return cmd;
  const ext = process.platform === "win32" ? ".cmd" : "";
  const candidate = path.join(process.cwd(), "node_modules", ".bin", `${cmd}${ext}`);
  return existsSync(candidate) ? candidate : cmd;
}

export function runSeed({ extraEnv = {} } = {}) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const seedPath = path.resolve(__dirname, "../../../prisma/seed.ts");
  const tsx = resolveBin("tsx");

  // `seed.ts` lives outside `app/frontend/`, so Node would normally look for deps like
  // `@prisma/client` and `bcryptjs` under `/repo/prisma/node_modules` and fail in Docker.
  // Point module resolution at `app/frontend/node_modules` for the seed process.
  const nodeModules = path.resolve(process.cwd(), "node_modules");
  const existingNodePath = process.env.NODE_PATH;
  const nodePath = existingNodePath ? `${nodeModules}${path.delimiter}${existingNodePath}` : nodeModules;

  const env = {
    ...process.env,
    NODE_PATH: nodePath,
    ...extraEnv,
  };

  const result = spawnSync(tsx, [seedPath], { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entry === import.meta.url) runSeed();
