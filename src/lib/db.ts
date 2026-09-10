import { PrismaClient } from "@prisma/client";

/** Pooled connection string. Accepts the Supabase–Vercel integration's names as well as DATABASE_URL. */
export function databaseUrl(): string {
  const v = [process.env.DATABASE_URL, process.env.POSTGRES_PRISMA_URL, process.env.POSTGRES_URL].find((x) => x && x.trim());
  if (!v) throw new Error("No database URL. Set DATABASE_URL, or connect the Supabase integration on Vercel.");
  return v;
}

const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });
if (process.env.NODE_ENV !== "production") g.prisma = db;
