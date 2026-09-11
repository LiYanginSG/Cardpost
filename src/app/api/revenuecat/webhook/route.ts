import { bookForProduct, creditPurchase } from "@/server/purchases";

export const dynamic = "force-dynamic";

type RcEvent = {
  type: string;
  id?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  transaction_id?: string;
  environment?: "SANDBOX" | "PRODUCTION";
  price?: number;
  price_in_purchased_currency?: number;
  currency?: string;
  store?: string;
};

/**
 * RevenueCat webhook for the iOS / Android apps. Configure it in RevenueCat → Integrations → Webhooks with
 * an Authorization header value equal to REVENUECAT_WEBHOOK_SECRET. The app must identify the user to
 * RevenueCat with our User.id as the app_user_id.
 */
export async function POST(req: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) return new Response("REVENUECAT_WEBHOOK_SECRET not set", { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== secret && auth !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as { event?: RcEvent } | null;
  const ev = body?.event;
  if (!ev) return Response.json({ ok: false, reason: "no event" }, { status: 400 });

  // Postage books are consumables. RevenueCat reports them as NON_RENEWING_PURCHASE (or INITIAL_PURCHASE for some stores).
  if (!["NON_RENEWING_PURCHASE", "INITIAL_PURCHASE"].includes(ev.type)) return Response.json({ ok: true, result: "ignored", type: ev.type });
  if (ev.environment === "SANDBOX" && process.env.NODE_ENV === "production" && process.env.REVENUECAT_ALLOW_SANDBOX !== "1") {
    return Response.json({ ok: true, result: "sandbox-ignored" });
  }
  const userId = ev.app_user_id || ev.original_app_user_id || "";
  const book = ev.product_id ? bookForProduct(ev.product_id) : undefined;
  const txn = ev.transaction_id || ev.id || "";
  if (!userId || !book || !txn) return Response.json({ ok: true, result: "ignored", reason: "unknown user, product or transaction" });

  const amount = Math.round(((ev.price_in_purchased_currency ?? ev.price ?? 0) as number) * 100);
  const result = await creditPurchase({ userId, provider: "revenuecat", externalId: txn, productId: ev.product_id, postage: book.postage, amount, currency: ev.currency ?? "usd" });
  return Response.json({ ok: true, result });
}
