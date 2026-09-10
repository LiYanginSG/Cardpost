#!/usr/bin/env node
/**
 * Runs a command with DATABASE_URL and DIRECT_URL filled in from whatever the hosting integration provides.
 * The Supabase–Vercel integration sets POSTGRES_PRISMA_URL (pooled) and POSTGRES_URL_NON_POOLING (direct);
 * Neon sets DATABASE_URL and DATABASE_URL_UNPOOLED. Explicit DATABASE_URL / DIRECT_URL always win.
 *
 *   node scripts/db-env.mjs prisma migrate deploy
 */
import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";

const env = { ...process.env };
const first = (...keys) => keys.map((k) => env[k]).find((v) => v && v.trim());

env.DATABASE_URL = first("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL") ?? "";
env.DIRECT_URL = first("DIRECT_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED", "POSTGRES_URL") ?? env.DATABASE_URL;

if (!env.DATABASE_URL) {
  console.error("No database URL found. Set DATABASE_URL (or connect the Supabase integration, which sets POSTGRES_PRISMA_URL).");
  process.exit(1);
}

// Make locally installed binaries (prisma, next) resolvable even when this script is run outside npm.
env.PATH = [join(process.cwd(), "node_modules", ".bin"), env.PATH ?? ""].join(delimiter);

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: node scripts/db-env.mjs <command> [args...]");
  process.exit(1);
}
const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
if (r.error) {
  console.error(`Could not run ${cmd}: ${r.error.message}`);
  process.exit(1);
}
process.exit(r.status ?? 1);
