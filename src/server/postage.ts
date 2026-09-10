import "server-only";
import { db } from "@/lib/db";
import { POSTAGE_CAP, WEEKLY_POSTAGE } from "@/lib/format";
import type { User } from "@prisma/client";

/** Next Sunday 00:00 UTC strictly after d. */
function nextSunday(d: Date): Date {
  const s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const add = (7 - s.getUTCDay()) % 7 || 7;
  s.setUTCDate(s.getUTCDate() + add);
  return s;
}

/**
 * Free postage arrives every Sunday whether or not the user opened the app, capped at 40.
 * Purchased postage above the cap is never reduced. Computed lazily on read and by the hourly cron.
 */
export async function settleWeeklyPostage(user: User, now: Date): Promise<User> {
  let postage = user.postage;
  let grantedAt = user.postageGrantedAt;
  let sunday = nextSunday(grantedAt);
  let changed = false;
  while (sunday <= now) {
    postage = Math.max(postage, Math.min(POSTAGE_CAP, postage + WEEKLY_POSTAGE));
    grantedAt = sunday;
    sunday = nextSunday(sunday);
    changed = true;
  }
  if (!changed) return user;
  return db.user.update({ where: { id: user.id }, data: { postage, postageGrantedAt: grantedAt } });
}

export function nextPostageDate(user: User): Date {
  return nextSunday(user.postageGrantedAt);
}
