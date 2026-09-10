import "server-only";
import { after } from "next/server";
import { runHourly } from "./cron";

const INTERVAL_MS = 15 * 60_000;
const g = globalThis as unknown as { __cpLastRun?: number };

/**
 * Vercel Hobby allows only a daily cron, so the maintenance job also runs opportunistically after page loads,
 * at most once per 15 minutes per server instance. It is idempotent, so overlapping runs are harmless.
 */
export function maintenanceTick() {
  const t = Date.now();
  if (g.__cpLastRun && t - g.__cpLastRun < INTERVAL_MS) return;
  g.__cpLastRun = t;
  after(async () => {
    try {
      await runHourly(new Date());
    } catch (e) {
      console.error("maintenance tick failed", e);
    }
  });
}
