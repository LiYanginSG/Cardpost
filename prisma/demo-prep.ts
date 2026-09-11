import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DAY = 86_400_000;

async function main() {
  const designs = ["classic", "monsoon", "ember", "polar", "archipelago", "lantern"];
  const stamps = ["house", "crane", "orchid", "beacon", "koi"];
  const me = await db.user.upsert({
    where: { email: "amelia@cardpost.demo" },
    update: { ownedDesigns: designs, ownedStamps: stamps, activeDesign: "classic", activeStamp: "house", postage: 24, city: "Singapore" },
    create: { email: "amelia@cardpost.demo", handle: "amelia", displayName: "Amelia", city: "Singapore", postage: 24, ownedDesigns: designs, ownedStamps: stamps, openToWandering: true },
  });
  const sofia = await db.user.findUniqueOrThrow({ where: { email: "sofiareis@demo.cardpost.invalid" } });
  const hana = await db.user.findUniqueOrThrow({ where: { email: "hanamori@demo.cardpost.invalid" } });
  for (const f of [sofia, hana]) {
    await db.friendship.upsert({ where: { userId_friendId: { userId: f.id, friendId: me.id } }, update: { status: "accepted" }, create: { userId: f.id, friendId: me.id, status: "accepted" } });
  }
  // Everything else out of the way, then one card that landed an hour ago and hasn't been opened.
  await db.card.deleteMany({ where: { OR: [{ recipientId: me.id }, { senderId: me.id }] } });
  const now = Date.now();
  await db.card.create({
    data: {
      type: "sealed", title: "The window seat", designId: "polar", stampId: "crane",
      senderId: sofia.id, senderCity: "Lisbon", recipientId: me.id, recipientCity: "Singapore",
      body: "Flew home over the ice this week and thought of you the whole way. Eleven days for this to reach you. Worth every one of them.",
      sentAt: new Date(now - 11 * DAY), arrivesAt: new Date(now - 3600_000), distanceKm: 11886, status: "delivered",
    },
  });
  // A welcome card that was opened days ago, so the backfill leaves things alone and the inbox has history.
  const founder = await db.user.findFirst({ where: { email: "liveyangliveval@gmail.com" } });
  if (founder?.city) {
    await db.card.create({
      data: {
        type: "sealed", title: "Welcome to Cardpost", designId: founder.activeDesign, stampId: founder.activeStamp,
        senderId: founder.id, senderCity: founder.city, recipientId: me.id, recipientCity: "Singapore",
        body: "Welcome to Cardpost. Every card here takes the slow way. Write one to someone you miss, and write back to me anytime.",
        sentAt: new Date(now - 6 * DAY), arrivesAt: new Date(now - 5 * DAY), openedAt: new Date(now - 5 * DAY), distanceKm: 0, status: "delivered",
      },
    });
  }
  console.log("demo ready:", me.handle);
}
main().finally(() => db.$disconnect());
