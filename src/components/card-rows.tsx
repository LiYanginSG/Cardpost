import Link from "next/link";
import type { CardFull } from "@/server/cards";
import { routeCities } from "@/server/cards";
import { DesignThumb } from "./postcard";
import { Sheet } from "./map-sheet";
import { WorldMap } from "./world-map";
import { fmtDate, fmtMonth, daysLeft } from "@/lib/format";
import { fmtKm } from "@/lib/geo";

export function progressOf(c: { sentAt: Date; arrivesAt: Date | null }, now: Date) {
  if (!c.arrivesAt) return 0;
  const total = c.arrivesAt.getTime() - c.sentAt.getTime();
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, (now.getTime() - c.sentAt.getTime()) / total));
}

/** One row per card, grouped by month. Fixed height, text clamps. */
export function CardList({ cards, now, mode }: { cards: CardFull[]; now: Date; mode: "in" | "out" }) {
  const groups = new Map<string, CardFull[]>();
  for (const c of cards) {
    const k = fmtMonth(mode === "in" ? c.arrivesAt ?? c.sentAt : c.sentAt);
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  return (
    <div className="list">
      {[...groups.entries()].map(([month, list]) => (
        <div key={month}>
          <div className="group">{month}</div>
          {list.map((c) => {
            const other = mode === "in" ? c.sender : c.recipient;
            const unread = mode === "in" && !c.openedAt;
            const arrived = c.arrivesAt ? c.arrivesAt <= now : false;
            return (
              <Link key={c.id} href={`/card/${c.id}`} className="row">
                <DesignThumb designId={c.designId} />
                <div className="t">
                  <b>{c.type === "sealed" && mode === "in" && unread ? "Sealed card" : c.title}</b>
                  <span>{c.type === "wandering" && mode === "in" ? "a stranger" : other?.displayName ?? "—"} · {fmtKm(c.distanceKm)}</span>
                </div>
                <div className="r">
                  {mode === "out" && !arrived ? `${daysLeft(c.arrivesAt ?? now, now)}d left` : fmtDate(c.arrivesAt ?? c.sentAt)}
                  {unread && <span className="unread" aria-label="unread" />}
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Sender-side tracking: progress line, tap for the world map. Recipient gets silence. */
export function TrackRow({ card, now }: { card: CardFull; now: Date }) {
  const p = progressOf(card, now);
  const arrived = p >= 1;
  const cities = card.type === "sealed" ? [card.senderCity, card.recipientCity ?? card.senderCity] : routeCities(card).concat(card.status === "in_transit" && card.recipientCity ? [card.recipientCity] : []);
  const label = card.status === "pooled" ? "waiting for a holder" : arrived ? (card.openedAt ? `opened ${fmtDate(card.openedAt)}` : card.type === "sealed" ? "arrived · not yet opened" : "arrived · in a stranger's hands") : `${daysLeft(card.arrivesAt ?? now, now)} days to go`;
  return (
    <div className="track">
      <div className="hd">
        <b><Link href={`/card/${card.id}`}>{card.title}</Link></b>
        <span>{label}</span>
      </div>
      <div className="prog"><i style={{ width: `${p * 100}%` }} /><b className={arrived ? "done" : ""} style={{ left: `${p * 100}%` }} /></div>
      <div className="ft">
        <span>{cities[cities.length - 2] ?? card.senderCity} → {cities[cities.length - 1]} · {fmtKm(card.distanceKm)}</span>
        <span>{card.type === "sealed" ? `to ${card.recipient?.displayName ?? "—"}` : `${card.hops.length} signature${card.hops.length === 1 ? "" : "s"}`}</span>
      </div>
      <div className="row-actions">
        <Sheet label="View route" title={card.title}>
          <WorldMap cities={cities} progress={card.status === "in_transit" ? p : undefined} />
          <p className="muted" style={{ marginTop: 8 }}>Sent {fmtDate(card.sentAt)}{card.arrivesAt ? ` · arrives ${fmtDate(card.arrivesAt)}` : ""}</p>
        </Sheet>
        <Link href={`/card/${card.id}`} className="btn btn-sm btn-ghost">Open</Link>
      </div>
    </div>
  );
}
