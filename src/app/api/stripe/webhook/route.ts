import { handleStripeEvent } from "@/server/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();
  try {
    await handleStripeEvent(body, sig);
    return Response.json({ received: true });
  } catch (e) {
    console.error("stripe webhook", e);
    return new Response("bad signature", { status: 400 });
  }
}
