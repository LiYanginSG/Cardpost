import { runHourly } from "@/server/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel cron hits this hourly with Authorization: Bearer <CRON_SECRET>. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret && auth !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const report = await runHourly(new Date());
  return Response.json({ ok: true, at: new Date().toISOString(), ...report });
}
