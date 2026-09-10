import "server-only";
import { db } from "@/lib/db";
import { assignNextHolder } from "./cards";
import { sendEmail, appUrl } from "./email";
import { settleWeeklyPostage } from "./postage";

const DEMO_LINES = [
  "If you're reading this, the system works. Keep it moving.",
  "I have never been to where this is going. Tell me one thing about it.",
  "Bad week. Writing to no one in particular helps.",
  "It rained here all morning. I hope it's dry where you are.",
  "Passing this on before I lose my nerve. Be kind to the next person.",
  "Someone I loved used to send real postcards. This is the closest thing.",
];

export type CronReport = { delivered: number; notified: number; pooled: number; returned: number; botHops: number; postageSettled: number };

/** Hourly: flip arrived cards to delivered, notify, move stale wandering cards, grant weekly postage. */
export async function runHourly(now: Date): Promise<CronReport> {
  const report: CronReport = { delivered: 0, notified: 0, pooled: 0, returned: 0, botHops: 0, postageSettled: 0 };

  // 1. Deliveries. Recipient queries already hide unarrived cards; this flips the status and sends the one push this app sends.
  const arrived = await db.card.findMany({ where: { status: "in_transit", arrivesAt: { lte: now } }, include: { recipient: true, sender: true } });
  for (const c of arrived) {
    await db.card.update({ where: { id: c.id }, data: { status: "delivered" } });
    report.delivered++;
    if (c.recipient && c.recipient.notifyOnArrival && !c.notifiedAt && !c.recipient.isDemo) {
      const who = c.type === "sealed" ? `${c.sender.displayName ?? "Someone"} in ${c.senderCity}` : "a stranger";
      await sendEmail(
        c.recipient.email,
        c.type === "sealed" ? "A card has arrived" : "A wandering card has landed with you",
        `Something arrived in your mailbox from ${who}.\n\n${appUrl()}/card/${c.id}\n\nCardpost sends this one email and nothing else.`,
      ).catch((e) => console.error("arrival email failed", e));
      await db.card.update({ where: { id: c.id }, data: { notifiedAt: now } });
      report.notified++;
    }
  }

  // 2. Pooled wandering cards: try again to find a holder.
  const pooled = await db.card.findMany({ where: { type: "wandering", status: "pooled" }, select: { id: true } });
  for (const c of pooled) {
    await assignNextHolder(c.id, now);
    report.pooled++;
  }

  // 3. Wandering cards sitting unactioned with a holder for 7+ days go back to the pool.
  const stale = await db.card.findMany({
    where: { type: "wandering", status: "delivered", arrivesAt: { lte: new Date(now.getTime() - 7 * 86_400_000) }, recipient: { isDemo: false } },
    select: { id: true },
  });
  for (const c of stale) {
    await assignNextHolder(c.id, now);
    report.returned++;
  }

  // 4. Demo holders (seeded accounts) sign and pass cards on after a day, so the wall moves before there are many real users.
  if (process.env.DEMO_BOTS === "1") {
    const held = await db.card.findMany({
      where: { type: "wandering", status: "delivered", recipient: { isDemo: true }, arrivesAt: { lte: new Date(now.getTime() - 86_400_000) } },
      include: { recipient: true, hops: true },
    });
    for (const c of held) {
      if (!c.recipient?.city) continue;
      await db.wanderingHop.create({
        data: { cardId: c.id, holderId: c.recipient.id, city: c.recipient.city, note: DEMO_LINES[Math.floor(Math.random() * DEMO_LINES.length)], order: c.hops.length, addedAt: now },
      });
      await db.card.update({ where: { id: c.id }, data: { hopCount: { increment: 1 } } });
      await assignNextHolder(c.id, now);
      report.botHops++;
    }
  }

  // 5. Weekly postage for everyone, whether or not they opened the app.
  const users = await db.user.findMany({ where: { postageGrantedAt: { lt: new Date(now.getTime() - 6 * 86_400_000) } } });
  for (const u of users) {
    const before = u.postage;
    const after = await settleWeeklyPostage(u, now);
    if (after.postage !== before || after.postageGrantedAt !== u.postageGrantedAt) report.postageSettled++;
  }

  return report;
}
