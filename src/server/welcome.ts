import "server-only";
import { db } from "@/lib/db";
import { arrivalDate, haversineKm } from "@/lib/geo";
import { MAX_BODY } from "@/lib/format";

const DEFAULT_FROM = "liveyangliveval@gmail.com";
const DEFAULT_MESSAGE =
  "Welcome to Cardpost. This card left the day you joined and took the slow way, like everything here. Write one to someone you miss. I'll be reading. — Liyang";

/**
 * Every new person gets a welcome postcard from the app's founder account (WELCOME_FROM_EMAIL).
 * It travels at the normal speed for the distance, so the first card they ever receive arrives the way all cards do.
 * The founder is also added to their address book, so they can write back.
 * WELCOME_DELAY_DAYS overrides the travel time (0 = arrives at once). Silently does nothing if the founder account isn't set up.
 */
export async function sendWelcomeCard(recipientId: string, now: Date): Promise<void> {
  try {
    const fromEmail = (process.env.WELCOME_FROM_EMAIL || DEFAULT_FROM).toLowerCase();
    const [sender, recipient] = await Promise.all([db.user.findUnique({ where: { email: fromEmail } }), db.user.findUnique({ where: { id: recipientId } })]);
    if (!sender?.city || !recipient?.city || sender.id === recipient.id) return;
    const already = await db.card.count({ where: { senderId: sender.id, recipientId: recipient.id, type: "sealed" } });
    if (already > 0) return;

    const km = haversineKm(sender.city, recipient.city);
    const override = process.env.WELCOME_DELAY_DAYS;
    const arrivesAt = override !== undefined && override !== "" && Number.isFinite(Number(override))
      ? new Date(now.getTime() + Math.max(0, Number(override)) * 86_400_000)
      : arrivalDate(now, km);
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
