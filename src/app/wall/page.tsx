import Link from "next/link";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { wall } from "@/server/cards";
import { DesignThumb } from "@/components/postcard";
import { Sheet } from "@/components/map-sheet";
import { WorldMap } from "@/components/world-map";
import { fmtDate, fmtNum } from "@/lib/format";
import { fmtKm } from "@/lib/geo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wall" };

/** Routes longer than 4 hops collapse to Origin → … → Destination · N cities. */
function routeSummary(cities: string[]) {
  if (cities.length <= 4) return cities.join(" → ");
  return `${cities[0]} → … → ${cities[cities.length - 1]} · ${new Set(cities).size} cities`;
}

export default async function WallPage() {
  const user = await requireUser();
  const rows = await wall(50);
  return (
    <AppShell user={user} active="wall">
      <h1>The wall</h1>
      <p className="sub">Wandering cards ranked by how far they've travelled. A card returning to the same city twice doesn't get credit twice.</p>
      {rows.length === 0 && <div className="empty"><b>No wandering cards yet.</b>Post one from <Link className="link" href="/write?kind=wandering">Write</Link> and it will be the first.</div>}
      <div className="list">
        {rows.map((r, i) => (
          <div key={r.card.id} className="row" style={{ gridTemplateColumns: "56px 26px 1fr auto" }}>
            <DesignThumb designId={r.card.designId} />
            <span className={`rank ${i < 3 ? "top" : ""}`}>{i + 1}</span>
            <div className="t">
              <b>{r.card.title}</b>
              <span>{fmtKm(r.totalKm)} · {r.card.hops.length} hop{r.card.hops.length === 1 ? "" : "s"} · {routeSummary(r.cities)}</span>
            </div>
            <div className="r">
              <Sheet label="Route" title={r.card.title}>
                <WorldMap cities={r.cities.concat(r.card.status === "in_transit" && r.card.recipientCity ? [r.card.recipientCity] : [])} progress={r.card.status === "in_transit" ? 0.5 : undefined} />
                <div className="stats">
                  <div className="stat"><b>{fmtNum(r.totalKm)}</b><span>km travelled</span></div>
                  <div className="stat"><b>{r.uniqueCities}</b><span>unique cities</span></div>
                  <div className="stat"><b>{r.card.hops.length}</b><span>signatures</span></div>
                  <div className="stat"><b>{fmtDate(r.card.hops[0]?.addedAt ?? r.card.sentAt)}</b><span>first posted</span></div>
                </div>
                <h2>Chain</h2>
                {r.card.hops.map((h, j) => (
                  <div key={h.id} className="hop">
                    <div className="n">{j + 1}</div>
                    <div><div className="by" style={{ marginTop: 3 }}><Link className="link" href={`/p/${h.holder.handle}`}>{h.holder.displayName}</Link> · {h.city} · {fmtDate(h.addedAt)}</div></div>
                  </div>
                ))}
                {r.card.status === "in_transit" && <p className="muted" style={{ marginTop: 8 }}>Now en route to {r.card.recipientCity}.</p>}
              </Sheet>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
