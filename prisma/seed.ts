/**
 * Seeds demo holders and a few wandering cards so the wall and the pool have life before real users arrive.
 * Demo accounts can't sign in (no session is ever created for them). Safe to re-run.
 *
 *   npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { BUILTIN_DESIGNS, BUILTIN_STAMPS } from "../src/lib/catalogue";

const db = new PrismaClient();

const DEMO: [string, string, string][] = [
  ["Amy Lau", "amylau", "Kuala Lumpur"], ["Ben Ortiz", "benortiz", "Lima"], ["Sofia Reis", "sofiareis", "Lisbon"], ["Hana Mori", "hanamori", "Tokyo"],
  ["Thabo Nkosi", "thabonkosi", "Cape Town"], ["Elin Karlsson", "elinkarlsson", "Helsinki"], ["Marcus Webb", "marcuswebb", "Melbourne"], ["Ines Duarte", "inesduarte", "Buenos Aires"],
  ["Jun Wei", "junwei", "Taipei"], ["Sara Björk", "sarabjork", "Reykjavík"], ["Grace Lim", "gracelim", "Vancouver"], ["Priya Nair", "priyanair", "Mumbai"],
  ["Deniz Aydın", "denizaydin", "Istanbul"], ["Wanjiru Kamau", "wanjirukamau", "Nairobi"], ["Minji Park", "minjipark", "Seoul"], ["Cara Byrne", "carabyrne", "Dublin"],
];
const DESIGNS = ["classic", "monsoon", "ember", "polar", "archipelago", "nightpost", "lantern"];
const STAMPS = ["house", "crane", "orchid", "beacon", "koi", "comet"];
const CITY: Record<string, [number, number]> = {
  "Kuala Lumpur": [3.14, 101.69], Lima: [-12.05, -77.04], Lisbon: [38.72, -9.14], Tokyo: [35.68, 139.65], "Cape Town": [-33.92, 18.42], Helsinki: [60.17, 24.94],
  Melbourne: [-37.81, 144.96], "Buenos Aires": [-34.6, -58.38], Taipei: [25.03, 121.57], "Reykjavík": [64.15, -21.94], Vancouver: [49.28, -123.12], Mumbai: [19.08, 72.88],
  Istanbul: [41.01, 28.98], Nairobi: [-1.29, 36.82], Seoul: [37.57, 126.98], Dublin: [53.35, -6.26],
};
const rad = (d: number) => (d * Math.PI) / 180;
function km(a: string, b: string) {
  const [la1, lo1] = CITY[a], [la2, lo2] = CITY[b];
  const h = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)));
}
const days = (d: number) => Math.max(2, Math.min(14, Math.round(d / 1100)));
const DAY = 86_400_000;

const CARDS: { title: string; body: string; design: string; stamp: string; chain: number[]; notes: string[]; inTransit: boolean }[] = [
  { title: "Keep it moving", body: "If you're reading this, the system works. Add a line and send it somewhere I've never been.", design: "archipelago", stamp: "koi", chain: [8, 3, 9, 1, 14], notes: ["Rainy in Tokyo. Passing it west.", "Fog for three days straight. Sending it somewhere warm.", "Warm, but the sea is wild. Onward.", "Landed with the winter. Keep going."], inTransit: true },
  { title: "Tell me one thing", body: "One true thing about the place you're standing in. That's all I want.", design: "monsoon", stamp: "orchid", chain: [11, 4, 7], notes: ["The wind here has a name and everyone uses it.", "Everyone is asleep by nine. I love it."], inTransit: true },
  { title: "A note from a stranger", body: "Bad week. Writing to no one in particular helps. Be kind to whoever gets this next.", design: "nightpost", stamp: "comet", chain: [5, 15, 10, 6], notes: ["You'd like it here. Everyone talks to strangers.", "Crossing an ocean for you. Don't waste it.", "Read this on a tram. Cried a bit."], inTransit: false },
  { title: "Going up", body: "Started this on a stairwell with one lantern. Take it higher than I could.", design: "lantern", stamp: "crane", chain: [14, 12, 2], notes: ["Passing through the old city. Onward.", "Hills here. Counts as higher, I think."], inTransit: true },
  { title: "Sold in December only", body: "The long dark is nearly over. Sending some of it with this card so it doesn't go to waste.", design: "polar", stamp: "beacon", chain: [9, 13], notes: ["Sunlight all year here. Trading you some."], inTransit: true },
];

async function main() {
  await db.design.createMany({ data: BUILTIN_DESIGNS, skipDuplicates: true });
  await db.stamp.createMany({ data: BUILTIN_STAMPS, skipDuplicates: true });
  const users: Awaited<ReturnType<typeof db.user.upsert>>[] = [];
  for (let i = 0; i < DEMO.length; i++) {
    const [displayName, handle, city] = DEMO[i];
    const ownedDesigns = ["classic", ...DESIGNS.filter((_, j) => j > 0 && (i + j) % 3 === 0)];
    const ownedStamps = ["house", ...STAMPS.filter((_, j) => j > 0 && (i * 2 + j) % 4 === 0)];
    users.push(await db.user.upsert({
      where: { email: `${handle}@demo.cardpost.invalid` },
      update: { displayName, city, ownedDesigns, ownedStamps },
      create: { email: `${handle}@demo.cardpost.invalid`, handle, displayName, city, phoneVerified: true, openToWandering: true, notifyOnArrival: false, isDemo: true, postage: 40, ownedDesigns, ownedStamps, createdAt: new Date(Date.now() - (120 + i * 7) * DAY) },
    }));
  }

  const existing = await db.card.count({ where: { type: "wandering", sender: { isDemo: true } } });
  if (existing > 0) { console.log(`Demo cards already present (${existing}). Users refreshed; skipping cards.`); return; }

  for (const c of CARDS) {
    const chain = c.chain.map((i) => users[i]);
    let t = Date.now() - 60 * DAY;
    const hops: { holderId: string; city: string; note: string; order: number; addedAt: Date }[] = [];
    for (let i = 0; i < chain.length; i++) {
      const u = chain[i];
      hops.push({ holderId: u.id, city: u.city!, note: i === 0 ? c.body : c.notes[i - 1], order: i, addedAt: new Date(t) });
      if (i < chain.length - 1) t += (days(km(u.city!, chain[i + 1].city!)) + 2) * DAY;
    }
    const last = chain[chain.length - 1];
    // next holder: someone not in the chain
    const next = users.find((u) => !chain.includes(u))!;
    const legKm = km(last.city!, next.city!);
    const sentAt = new Date(t + DAY);
    const arrivesAt = new Date(sentAt.getTime() + days(legKm) * DAY);
    await db.card.create({
      data: {
        type: "wandering", title: c.title, body: c.body, designId: c.design, stampId: c.stamp,
        senderId: chain[0].id, senderCity: chain[0].city!,
        recipientId: next.id, recipientCity: next.city!, distanceKm: legKm,
        sentAt, arrivesAt: c.inTransit ? arrivesAt : new Date(Date.now() - 2 * DAY),
        status: c.inTransit ? "in_transit" : "delivered", hopCount: hops.length - 1, createdAt: hops[0].addedAt,
        hops: { create: hops },
      },
    });
  }
  console.log(`Seeded ${users.length} demo holders and ${CARDS.length} wandering cards.`);
}

main().finally(() => db.$disconnect());
