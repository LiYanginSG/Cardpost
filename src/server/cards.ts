import "server-only";
import { db } from "@/lib/db";
import { arrivalDate, haversineKm, postageCost, routeStats } from "@/lib/geo";
import { MAX_BODY, MAX_TITLE, PASS_COST, WANDERING_DAILY_LIMIT } from "@/lib/format";
import { getCatalogue } from "./catalogue";
import { moderate } from "./moderation";
import { areFriends } from "./friends";
import type { Card, User, WanderingHop, Prisma } from "@prisma/client";

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): Result<never> => ({ ok: false, error });

const cardInclude = {
  sender: { select: { id: true, handle: true, displayName: true, city: true } },
  recipient: { select: { id: true, handle: true, displayName: true, city: true } },
  hops: { orderBy: { order: "asc" as const }, include: { holder: { select: { id: true, handle: true, displayName: true } } } },
} satisfies Prisma.CardInclude;

export type CardFull = Prisma.CardGetPayload<{ include: typeof cardInclude }>;

function deriveTitle(body: string) {
  return body.split(/[.!?\n]/)[0].trim().slice(0, MAX_TITLE) || "A card";
}

async function validateCommon(user: User, designId: string, stampId: string, body: string) {
  if (!body.trim()) return "Write something first.";
  if (body.length > MAX_BODY) return `Keep it under ${MAX_BODY} characters.`;
  const cat = await getCatalogue();
  if (cat.design(designId).id !== designId || !user.ownedDesigns.includes(designId)) return "You don't own that postcard.";
  if (cat.stamp(stampId).id !== stampId || !user.ownedStamps.includes(stampId)) return "You don't own that stamp.";
  return null;
}

/* ---------------- sealed ---------------- */

export async function sendSealed(
  user: User & { city: string },
  input: { recipientId: string; designId: string; stampId: string; title?: string; body: string },
  now: Date,
): Promise<Result<Card>> {
  const body = input.body.trim();
  const err = await validateCommon(user, input.designId, input.stampId, body);
  if (err) return fail(err);
  if (input.recipientId === user.id) return fail("You can't write to yourself. Try a diary.");
  const recipient = await db.user.findUnique({ where: { id: input.recipientId } });
  if (!recipient?.city) return fail("That person isn't ready to receive mail yet.");
  // Sealed cards go only to people in your address book. This is the entire anti-harassment model.
  if (!(await areFriends(user.id, recipient.id))) return fail("Sealed cards only go to people in your address book.");

  const km = haversineKm(user.city, recipient.city);
  const cost = postageCost(km);
  if (user.postage < cost) return fail(`This card needs ${cost} postage and you have ${user.postage}.`);

  const title = (input.title?.trim() || deriveTitle(body)).slice(0, MAX_TITLE);
  const card = await db.$transaction(async (tx) => {
    const u = await tx.user.updateMany({ where: { id: user.id, postage: { gte: cost } }, data: { postage: { decrement: cost } } });
    if (u.count === 0) throw new Error("postage");
    return tx.card.create({
      data: {
        type: "sealed",
        title,
        designId: input.designId,
        stampId: input.stampId,
        senderId: user.id,
        senderCity: user.city,
        recipientId: recipient.id,
        recipientCity: recipient.city,
        body,
        sentAt: now,
        arrivesAt: arrivalDate(now, km),
        distanceKm: km,
        status: "in_transit",
      },
    });
  }).catch(() => null);
  if (!card) return fail("Not enough postage.");
  return { ok: true, value: card };
}

/**
 * Sender recalls a card that hasn't arrived yet. The card is destroyed and the postage refunded.
 * Sealed cards only, plus wandering cards nobody else has signed. Once it lands, it belongs to the recipient.
 */
export async function recallCard(cardId: string, userId: string, now: Date): Promise<Result> {
  const card = await db.card.findFirst({ where: { id: cardId, senderId: userId }, include: { hops: true } });
  if (!card) return fail("Not found.");
  const arrived = card.arrivesAt !== null && card.arrivesAt <= now;
  if (card.type === "sealed" && arrived) return fail("Too late. It has already landed.");
  if (card.type === "wandering" && (card.hops.length > 1 || (arrived && card.status !== "pooled"))) return fail("Too late. A stranger already has it.");
  const refund = card.type === "sealed" ? postageCost(card.distanceKm) : postageCost(card.distanceKm) || 1;
  await db.$transaction([
    db.card.delete({ where: { id: cardId } }),
    db.user.update({ where: { id: userId }, data: { postage: { increment: refund } } }),
  ]);
  return { ok: true, value: undefined };
}

/** Recipient breaks the seal. Only possible once the card has arrived. */
export async function openCard(cardId: string, userId: string, now: Date): Promise<Result> {
  const r = await db.card.updateMany({
    where: { id: cardId, recipientId: userId, arrivesAt: { lte: now }, openedAt: null },
    data: { openedAt: now, status: "delivered" },
  });
  return r.count ? { ok: true, value: undefined } : fail("This card hasn't arrived yet.");
}

/* ---------------- wandering ---------------- */

/** Eligible holders: opted in, verified, onboarded, not in the exclusion list. Prefers a different city. */
async function pickHolder(excludeIds: string[], fromCity: string): Promise<User | null> {
  const base: Prisma.UserWhereInput = {
    id: { notIn: excludeIds },
    openToWandering: true,
    city: { not: null },
    handle: { not: null },
    deletedAt: null,
  };
  let pool = await db.user.findMany({ where: { ...base, city: { not: fromCity } }, take: 200 });
  if (pool.length === 0) pool = await db.user.findMany({ where: base, take: 200 });
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Hands a wandering card to its next random holder, or parks it in the pool if nobody is eligible. */
export async function assignNextHolder(cardId: string, now: Date): Promise<void> {
  const card = await db.card.findUnique({ where: { id: cardId }, include: { hops: true } });
  if (!card || card.type !== "wandering" || card.status === "frozen") return;
  const exclude = [card.senderId, ...card.hops.map((h) => h.holderId), ...(card.recipientId ? [card.recipientId] : [])];
  const lastCity = card.hops.length ? card.hops[card.hops.length - 1].city : card.senderCity;
  const holder = await pickHolder(exclude, lastCity);
  if (!holder || !holder.city) {
    await db.card.update({ where: { id: cardId }, data: { status: "pooled", recipientId: null, recipientCity: null, arrivesAt: null, openedAt: null, notifiedAt: null } });
    return;
  }
  const km = haversineKm(lastCity, holder.city);
  await db.card.update({
    where: { id: cardId },
    data: {
      status: "in_transit",
      recipientId: holder.id,
      recipientCity: holder.city,
      distanceKm: km,
      sentAt: now,
      arrivesAt: arrivalDate(now, km),
      openedAt: null,
      notifiedAt: null,
    },
  });
}

export async function wanderingSentToday(userId: string, now: Date): Promise<number> {
  return db.card.count({ where: { senderId: userId, type: "wandering", createdAt: { gte: new Date(now.getTime() - 86_400_000) } } });
}

export async function sendWandering(
  user: User & { city: string },
  input: { designId: string; stampId: string; title: string; body: string },
  now: Date,
): Promise<Result<Card>> {
  const body = input.body.trim();
  const title = input.title.trim().slice(0, MAX_TITLE);
  const err = await validateCommon(user, input.designId, input.stampId, body);
  if (err) return fail(err);
  if (!title) return fail("Wandering cards need a title. It's how people find this card on the wall.");
  if (!user.openToWandering) return fail("Open yourself to wandering mail in Account first.");
  if ((await wanderingSentToday(user.id, now)) >= WANDERING_DAILY_LIMIT) return fail(`You've posted ${WANDERING_DAILY_LIMIT} wandering cards today. Try again tomorrow.`);

  const mod = await moderate(`${title}\n${body}`);
  if (!mod.ok) return fail("This can't go into the wandering pool. Public cards are checked before they leave, so a stranger never has to be the one who finds it.");

  // Cost is the first leg. The holder is random, so charge the average-ish long leg cost fairly: charge after assignment.
  const card = await db.card.create({
    data: {
      type: "wandering",
      title,
      designId: input.designId,
      stampId: input.stampId,
      senderId: user.id,
      senderCity: user.city,
      body,
      sentAt: now,
      status: "pooled",
      hops: { create: { holderId: user.id, city: user.city, note: body, order: 0, addedAt: now } },
    },
  });
  await assignNextHolder(card.id, now);
  const assigned = await db.card.findUnique({ where: { id: card.id } });
  const cost = postageCost(assigned?.distanceKm ?? 0) || 1;
  if (user.postage < cost) {
    await db.card.delete({ where: { id: card.id } });
    return fail(`This card needs ${cost} postage and you have ${user.postage}.`);
  }
  await db.user.update({ where: { id: user.id }, data: { postage: { decrement: cost } } });
  return { ok: true, value: assigned ?? card };
}

/** Holder adds a line and passes the card on. Costs 1 postage. */
export async function passOn(cardId: string, user: User & { city: string }, note: string, now: Date): Promise<Result> {
  const text = note.trim();
  if (!text) return fail("Add a line before you pass it on, or return it to the pool.");
  if (text.length > MAX_BODY) return fail(`Keep it under ${MAX_BODY} characters.`);
  const card = await db.card.findFirst({ where: { id: cardId, type: "wandering", recipientId: user.id, arrivesAt: { lte: now } }, include: { hops: true } });
  if (!card) return fail("This card isn't in your hands.");
  const mod = await moderate(text);
  if (!mod.ok) return fail("That line can't go on a public card.");
  if (user.postage < PASS_COST) return fail("Passing a card on costs 1 postage.");
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { postage: { decrement: PASS_COST } } }),
    db.wanderingHop.create({ data: { cardId, holderId: user.id, city: user.city, note: text, order: card.hops.length, addedAt: now } }),
    db.card.update({ where: { id: cardId }, data: { hopCount: { increment: 1 } } }),
  ]);
  await assignNextHolder(cardId, now);
  return { ok: true, value: undefined };
}

/** Holder returns the card to the pool without signing it. Free. */
export async function returnToPool(cardId: string, userId: string, now: Date): Promise<Result> {
  const card = await db.card.findFirst({ where: { id: cardId, type: "wandering", recipientId: userId, arrivesAt: { lte: now } } });
  if (!card) return fail("This card isn't in your hands.");
  await assignNextHolder(cardId, now);
  return { ok: true, value: undefined };
}

/** A reported note is stripped and the card keeps moving. */
export async function reportHop(hopId: string, reporterId: string): Promise<Result> {
  const hop = await db.wanderingHop.findUnique({ where: { id: hopId }, include: { card: true } });
  if (!hop) return fail("Not found.");
  const canSee = hop.card.recipientId === reporterId || (await db.wanderingHop.count({ where: { cardId: hop.cardId, holderId: reporterId } })) > 0;
  if (!canSee) return fail("Not found.");
  await db.wanderingHop.update({ where: { id: hopId }, data: { removed: true } });
  console.warn(`[report] hop ${hopId} on card ${hop.cardId} reported by ${reporterId}`);
  return { ok: true, value: undefined };
}

/* ---------------- queries ---------------- */

/** Sealed cards that have arrived. Unarrived cards must not exist in the recipient's queries at all. */
export function sealedInbox(userId: string, now: Date) {
  return db.card.findMany({ where: { type: "sealed", recipientId: userId, arrivesAt: { lte: now } }, orderBy: { arrivesAt: "desc" }, include: cardInclude });
}
export function sealedOutbox(userId: string) {
  return db.card.findMany({ where: { type: "sealed", senderId: userId }, orderBy: { sentAt: "desc" }, include: cardInclude });
}
export function wanderingInbox(userId: string, now: Date) {
  return db.card.findMany({ where: { type: "wandering", recipientId: userId, arrivesAt: { lte: now }, status: { not: "frozen" } }, orderBy: { arrivesAt: "desc" }, include: cardInclude });
}
/** Cards you posted and cards you've signed that are still travelling. */
export function wanderingOutbox(userId: string) {
  return db.card.findMany({
    where: { type: "wandering", OR: [{ senderId: userId }, { hops: { some: { holderId: userId } } }], NOT: { recipientId: userId } },
    orderBy: { sentAt: "desc" },
    include: cardInclude,
  });
}
/** The card the user is allowed to look at, or null. Sealed: sender always; recipient only once arrived. */
export async function visibleCard(cardId: string, userId: string, now: Date): Promise<CardFull | null> {
  const c = await db.card.findUnique({ where: { id: cardId }, include: cardInclude });
  if (!c) return null;
  if (c.senderId === userId) return c;
  if (c.recipientId === userId && c.arrivesAt && c.arrivesAt <= now) return c;
  if (c.type === "wandering" && c.hops.some((h) => h.holderId === userId)) return c;
  return null;
}

export type WallRow = { card: CardFull; totalKm: number; uniqueCities: number; cities: string[] };

/** Wandering cards ranked by total distance travelled, then unique cities. */
export async function wall(limit = 50): Promise<WallRow[]> {
  const cards = await db.card.findMany({ where: { type: "wandering", status: { not: "frozen" } }, include: cardInclude, take: 500, orderBy: { hopCount: "desc" } });
  const rows = cards.map((card) => {
    const cities = routeCities(card);
    const s = routeStats(cities);
    return { card, totalKm: s.totalKm, uniqueCities: s.uniqueCities, cities };
  });
  rows.sort((a, b) => b.totalKm - a.totalKm || b.uniqueCities - a.uniqueCities);
  return rows.slice(0, limit);
}

/** Cities the card has passed through, in order, including the current leg's destination once it has landed. */
export function routeCities(card: CardFull | (Card & { hops: WanderingHop[] })): string[] {
  const cities = card.hops.map((h) => h.city);
  if (card.type === "wandering" && card.recipientCity && card.status === "delivered") cities.push(card.recipientCity);
  if (card.type === "sealed") return [card.senderCity, card.recipientCity ?? card.senderCity];
  return cities.length ? cities : [card.senderCity];
}
