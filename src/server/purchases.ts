import "server-only";
import { db } from "@/lib/db";
import { BOOKS, type PostageBook } from "@/lib/catalogue";

export type Provider = "stripe" | "revenuecat";

/**
 * Credits postage for a paid purchase. Idempotent on (provider transaction id): a webhook delivered twice credits once.
 * Every payment door (Stripe on the web, RevenueCat on iOS/Android) ends here.
 */
export async function creditPurchase(p: { userId: string; provider: Provider; externalId: string; productId?: string; postage: number; amount: number; currency: string }): Promise<"credited" | "duplicate" | "no-user"> {
  if (!p.postage || p.postage <= 0) return "duplicate";
  const user = await db.user.findUnique({ where: { id: p.userId }, select: { id: true } });
  if (!user) return "no-user";
  try {
    await db.$transaction([
      db.purchase.create({ data: { userId: p.userId, provider: p.provider, sessionId: `${p.provider}:${p.externalId}`, productId: p.productId, postage: p.postage, amount: p.amount, currency: p.currency.toLowerCase() } }),
      db.user.update({ where: { id: p.userId }, data: { postage: { increment: p.postage } } }),
    ]);
    return "credited";
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return "duplicate"; // unique sessionId: already credited
    throw e;
  }
}

/** Maps a store product id to a postage book. Accepts our ids (book30) and store-style ids (cardpost_postage_30, postage_30). */
export function bookForProduct(productId: string): PostageBook | undefined {
  const direct = BOOKS.find((b) => b.id === productId);
  if (direct) return direct;
  const m = productId.match(/(\d+)\s*$/);
  return m ? BOOKS.find((b) => b.postage === Number(m[1])) : undefined;
}

export const storeCurrency = () => (process.env.STORE_CURRENCY || "usd").toLowerCase();
export function priceLabel(cents: number): string {
  const cur = storeCurrency().toUpperCase();
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: cur, currencyDisplay: cur === "SGD" ? "code" : "symbol" }).format(cents / 100).replace("SGD", "S$").replace(/\s/g, "");
  } catch {
    return `${cur} ${(cents / 100).toFixed(2)}`;
  }
}
