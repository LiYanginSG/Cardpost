import { searchCities } from "@/lib/cities";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const rows = searchCities(q, 12).map((c) => ({ name: c.name, cc: c.cc }));
  return Response.json(rows, { headers: { "cache-control": "public, max-age=3600" } });
}
