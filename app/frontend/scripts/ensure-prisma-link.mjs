import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const linkPath = path.resolve(process.cwd(), "prisma");
  try {
    const stat = await fs.lstat(linkPath);
    if (stat.isSymbolicLink() || stat.isDirectory()) return;
  } catch {
    // continue
  }

  const target = path.resolve(process.cwd(), "../../prisma");
  await fs.symlink(target, linkPath, "dir");
}

main().catch((err) => {
  console.error("[prisma-link] failed to create app/frontend/prisma symlink to ../../prisma");
  console.error(err);
  process.exit(1);
});
