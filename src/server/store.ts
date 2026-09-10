import "server-only";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { BOOKS } from "@/lib/catalogue";
import { getCatalogue } from "./catalogue";
import { appUrl } from "./email";

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function buyDesign(userId: string, designId: string): Promise<{ ok: boolean; error?: string }> {
  const cat = await getCatalogue();
  const d = cat.designs.find((x) => x.id === designId && x.active);
  if (!d) return { ok: false, error: "That design isn't for sale." };
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.ownedDesigns.includes(d.id)) return { ok: false, error: "Already in your collection." };
  if (u.postage < d.cost) return { ok: false, error: `Needs ${d.cost} postage. You have ${u.postage}.` };
  await db.user.update({ where: { id: userId }, data: { postage: { decrement: d.cost }, ownedDesigns: { push: d.id } } });
  return { ok: true };
}

export async function buyStamp(userId: string, stampId: string): Promise<{ ok: boolean; error?: string }> {
  const cat = await getCatalogue();
  const s = cat.stamps.find((x) => x.id === stampId && x.active);
  if (!s) return { ok: false, error: "That stamp isn't for sale." };
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.ownedStamps.includes(s.id)) return { ok: false, error: "Already in your collection." };
  if (u.postage < s.cost) return { ok: false, error: `Needs ${s.cost} postage. You have ${u.postage}.` };
  await db.user.update({ where: { id: userId }, data: { postage: { decrement: s.cost }, ownedStamps: { push: s.id } } });
  return { ok: true };
}

export async function setActive(userId: string, designId?: string, stampId?: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const data: { activeDesign?: string; activeStamp?: string } = {};
  if (designId && u.ownedDesigns.includes(designId)) data.activeDesign = designId;
  if (stampId && u.ownedStamps.includes(stampId)) data.activeStamp = stampId;
  if (Object.keys(data).length) await db.user.update({ where: { id: userId }, data });
}

/** Stripe Checkout for a postage book. Returns the hosted checkout URL. */
export async function createCheckout(userId: string, email: string, bookId: string): Promise<string | null> {
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book || !stripeConfigured()) return null;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: book.priceCents, product_data: { name: `Postage book · ${book.postage}`, description: book.why } } }],
    metadata: { userId, bookId, postage: String(book.postage) },
    success_url: `${appUrl()}/store?paid=1`,
    cancel_url: `${appUrl()}/store`,
  });
  return session.url;
}

/** Credits postage once per checkout session. Idempotent. */
export async function handleStripeEvent(rawBody: string, signature: string): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET missing");
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  if (event.type !== "checkout.session.completed") return;
  const s = event.data.object;
  const userId = s.metadata?.userId;
  const postage = Number(s.metadata?.postage ?? 0);
  if (!userId || !postage) return;
  const exists = await db.purchase.findUnique({ where: { sessionId: s.id } });
  if (exists) return;
  await db.$transaction([
    db.purchase.create({ data: { userId, sessionId: s.id, postage, amount: s.amount_total ?? 0, currency: s.currency ?? "usd" } }),
    db.user.update({ where: { id: userId }, data: { postage: { increment: postage } } }),
  ]);
}
