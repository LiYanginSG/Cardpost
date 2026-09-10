import { cookies } from "next/headers";
import { CLOCK_COOKIE, TIME_TRAVEL_ENABLED } from "@/lib/clock";

export async function POST(req: Request) {
  if (!TIME_TRAVEL_ENABLED) return new Response("disabled", { status: 404 });
  const { days } = (await req.json()) as { days?: number };
  const c = await cookies();
  const d = Math.max(0, Math.min(365, Number(days) || 0));
  c.set(CLOCK_COOKIE, String(d), { path: "/", sameSite: "lax" });
  return Response.json({ days: d });
}
