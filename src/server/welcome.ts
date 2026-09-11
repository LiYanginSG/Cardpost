import "server-only";
import { db } from "@/lib/db";
import { arrivalDate, haversineKm } from "@/lib/geo";
import { MAX_BODY } from "@/lib/format";

const DEFAULT_FROM = "liveyangliveval@gmail.com";
const DEFAULT_MESSAGE =
  "Welcome to Cardpost. This card left the day you joined and took the slow way, like everything here. Write one to someone you miss. I'll be reading. — Liyang";

/**
 * Every new person gets a welcome postcard from the app's founder account (WELCOME_FROM_EMAIL).
 * It arrives at once, so the first thing in a new mailbox is a sealed card to open.
 * WELCOME_DELAY_DAYS sets a delay in days instead; "auto" makes it travel at normal speed for the distance.
 * The founder is also added to their address book, so they can write back.
 * Silently does nothing if the founder account isn't set up.
 */
export async function sendWelcomeCard(recipientId: string, now: Date): Promise<void> {
  try {
    const fromEmail = (process.env.WELCOME_FROM_EMAIL || DEFAULT_FROM).toLowerCase();
    const [sender, recipient] = await Promise.all([db.user.findUnique({ where: { email: fromEmail } }), db.user.findUnique({ where: { id: recipientId } })]);
    if (!sender?.city || !recipient?.city || sender.id === recipient.id) return;
    const already = await db.card.count({ where: { senderId: sender.id, recipientId: recipient.id, type: "sealed" } });
    if (already > 0) return;

    const km = haversineKm(sender.city, recipient.city);
    const delay = (process.env.WELCOME_DELAY_DAYS ?? "0").trim().toLowerCase();
    const arrivesAt = delay === "auto" ? arrivalDate(now, km) : new Date(now.getTime() + Math.max(0, Number(delay) || 0) * 86_400_000);
    const body = (process.env.WELCOME_MESSAGE || DEFAULT_MESSAGE).slice(0, MAX_BODY);

    await db.$transaction([
      db.card.create({
        data: {
          type: "sealed",
          title: "Welcome to Cardpost",
          designId: sender.activeDesign,
          stampId: sender.activeStamp,
          senderId: sender.id,
          senderCity: sender.city,
          recipientId: recipient.id,
          recipientCity: recipient.city,
          body,
          sentAt: now,
          arrivesAt,
          distanceKm: km,
          status: arrivesAt <= now ? "delivered" : "in_transit",
        },
      }),
      db.friendship.upsert({
        where: { userId_friendId: { userId: sender.id, friendId: recipient.id } },
        update: { status: "accepted" },
        create: { userId: sender.id, friendId: recipient.id, status: "accepted" },
      }),
    ]);
  } catch (e) {
    console.error("welcome card failed", e);
  }
}

/** Anyone who set up their account without receiving a welcome card (signed up before the founder existed, say) gets one now. */
export async function backfillWelcomeCards(now: Date): Promise<number> {
  const fromEmail = (process.env.WELCOME_FROM_EMAIL || DEFAULT_FROM).toLowerCase();
  const sender = await db.user.findUnique({ where: { email: fromEmail } });
  if (!sender?.city) return 0;
  const missing = await db.user.findMany({
    where: { id: { not: sender.id }, city: { not: null }, handle: { not: null }, isDemo: false, receivedCards: { none: { senderId: sender.id, type: "sealed" } } },
    select: { id: true },
    take: 200,
  });
  for (const u of missing) await sendWelcomeCard(u.id, now);
  return missing.length;
}
