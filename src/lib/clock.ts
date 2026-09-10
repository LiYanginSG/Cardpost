import { cookies } from "next/headers";

export const TIME_TRAVEL_ENABLED = process.env.DEV_TIME_TRAVEL === "1";
const COOKIE = "cp_clock_offset_days";

/**
 * "Now" for all delivery logic. In dev, an offset (in days) stored in a cookie can shift it forward,
 * so you can watch cards arrive without waiting a fortnight. Never enabled unless DEV_TIME_TRAVEL=1.
 */
export async function now(): Promise<Date> {
  if (!TIME_TRAVEL_ENABLED) return new Date();
  const c = await cookies();
  const off = Number(c.get(COOKIE)?.value ?? 0);
  return new Date(Date.now() + (Number.isFinite(off) ? off : 0) * 86_400_000);
}

export async function clockOffsetDays(): Promise<number> {
  if (!TIME_TRAVEL_ENABLED) return 0;
  const c = await cookies();
  const off = Number(c.get(COOKIE)?.value ?? 0);
  return Number.isFinite(off) ? off : 0;
}

export const CLOCK_COOKIE = COOKIE;
