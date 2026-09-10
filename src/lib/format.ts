export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const fmtDateYear = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const fmtMonth = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
export const fmtNum = (n: number) => n.toLocaleString("en-US");
export const initials = (n: string) =>
  n.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
/** Handwriting size scales down as the message lengthens so it never overflows. */
export const handSize = (t: string) => {
  const n = t.length;
  return n < 70 ? 20 : n < 120 ? 17 : n < 180 ? 15 : 13.5;
};
export const daysLeft = (arrivesAt: Date, now: Date) =>
  Math.max(0, Math.ceil((arrivesAt.getTime() - now.getTime()) / 86_400_000));
export const MAX_BODY = 240;
export const MAX_TITLE = 48;
export const WEEKLY_POSTAGE = 12;
export const POSTAGE_CAP = 40;
export const WANDERING_DAILY_LIMIT = 3;
export const PASS_COST = 1;
