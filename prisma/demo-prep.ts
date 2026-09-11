import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DAY = 86_400_000;

/** Stages a believable mailbox for screenshots: one sealed card waiting, two read, two in the post. */
async function main() {
  const designs = ["classic", "monsoon", "ember", "polar", "archipelago", "nightpost", "lantern"];
  const stamps = ["house", "crane", "orchid", "beacon", "koi", "comet"];
  const me = await db.user.upsert({
    where: { email: "amelia@cardpost.demo" },
    update: { ownedDesigns: designs, ownedStamps: stamps, activeDesign: "classic", activeStamp: "house", postage: 28, city: "Singapore", displayName: "Amelia Tan" },
    create: { email: "amelia@cardpost.demo", handle: "amelia", displayName: "Amelia Tan", city: "Singapore", postage: 28, ownedDesigns: designs, ownedStamps: stamps, openToWandering: true },
  });
  const who = async (email: string) => db.user.findUniqueOrThrow({ where: { email } });
  const sofia = await who("sofiareis@demo.cardpost.invalid");
  const hana = await who("hanamori@demo.cardpost.invalid");
  const sara = await who("sarabjork@demo.cardpost.invalid");
  const ben = await who("benortiz@demo.cardpost.invalid");
  for (const f of [sofia, hana, sara, ben]) {
    await db.friendship.upsert({ where: { userId_friendId: { userId: f.id, friendId: me.id } }, update: { status: "accepted" }, create: { userId: f.id, friendId: me.id, status: "accepted" } });
  }
  await db.card.deleteMany({ where: { OR: [{ recipientId: me.id }, { senderId: me.id }] } });
  const n = Date.now();
  const sealed = (from: typeof sofia, city: string, km: number, design: string, stamp: string, title: string, body: string, arrivedDaysAgo: number, opened: boolean) =>
    db.card.create({
      data: {
        type: "sealed", title, designId: design, stampId: stamp, senderId: from.id, senderCity: city,
        recipientId: me.id, recipientCity: "Singapore", body,
        sentAt: new Date(n - (arrivedDaysAgo + Math.round(km / 1100)) * DAY),
        arrivesAt: new Date(n - arrivedDaysAgo * DAY - 3600_000),
        openedAt: opened ? new Date(n - arrivedDaysAgo * DAY) : null,
        distanceKm: km, status: "delivered",
      },
    });

  await sealed(sofia, "Lisbon", 11886, "polar", "crane", "The window seat",
    "Flew home over the ice this week and thought of you the whole way. Eleven days for this to reach you. Worth every one of them.", 0, false);
  await sealed(hana, "Tokyo", 5318, "nightpost", "koi", "Written too late",
    "It is 2am and the sorting office is the only lit window on the street. I am fine. I just wanted someone to know where I was tonight.", 6, true);
  await sealed(sara, "Reykjavík", 11045, "monsoon", "comet", "The long dark is ending",
    "Four minutes more sun every day now. I have started counting them out loud at breakfast like a small ceremony. Come in summer.", 13, true);

  // Two of Amelia's own cards, still travelling, for the outbox and tracking shot.
  await db.card.create({ data: { type: "sealed", title: "Landed safely", designId: "ember", stampId: "koi", senderId: me.id, senderCity: "Singapore", recipientId: sofia.id, recipientCity: "Lisbon", body: "Landed safely. The rain here stopped the day your card arrived, which felt like a reply. Tell me about the ice.", sentAt: new Date(n - 3 * DAY), arrivesAt: new Date(n + 8 * DAY), distanceKm: 11886, status: "in_transit" } });
  await db.card.create({ data: { type: "sealed", title: "For the stairwell", designId: "lantern", stampId: "orchid", senderId: me.id, senderCity: "Singapore", recipientId: hana.id, recipientCity: "Tokyo", body: "Found a stairwell in Tiong Bahru with one lantern in it and thought of your card. Sending it back to you the long way.", sentAt: new Date(n - 1 * DAY), arrivesAt: new Date(n + 4 * DAY), distanceKm: 5318, status: "in_transit" } });

  const founder = await db.user.findFirst({ where: { email: "liveyangliveval@gmail.com" } });
  if (founder?.city) {
    await db.card.create({ data: { type: "sealed", title: "Welcome to Cardpost", designId: "archipelago", stampId: "beacon", senderId: founder.id, senderCity: founder.city, recipientId: me.id, recipientCity: "Singapore", body: "Welcome to Cardpost. Every card here takes the slow way. Write one to someone you miss, and write back to me anytime.", sentAt: new Date(n - 22 * DAY), arrivesAt: new Date(n - 21 * DAY), openedAt: new Date(n - 21 * DAY), distanceKm: 0, status: "delivered" } });
  }
  console.log("staged");
}
main().finally(() => db.$disconnect());
