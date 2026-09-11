import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { now } from "@/lib/clock";
import { routeCities, visibleCard } from "@/server/cards";
import { PostcardBack, PostcardFront } from "@/components/postcard";
import { SealReveal } from "@/components/seal-reveal";
import { FlipCard } from "@/components/flip-card";
import { WorldMap } from "@/components/world-map";
import { WanderingActions } from "@/components/wandering-actions";
import { ReportButton } from "@/components/report-button";
import { RecallButton } from "@/components/recall-button";
import { progressOf } from "@/components/card-rows";
import { getCatalogue } from "@/server/catalogue";
import { fmtDate, fmtNum } from "@/lib/format";
import { fmtKm, postageCost, routeStats } from "@/lib/geo";

export const dynamic = "force-dynamic";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const t = await now();
  const { id } = await params;
  const c = await visibleCard(id, user.id, t);
  if (!c) notFound();
  const cat = await getCatalogue();
  const d = cat.design(c.designId);
  const s = cat.stamp(c.stampId);
  const isRecipient = c.recipientId === user.id;
  const arrived = Boolean(c.arrivesAt && c.arrivesAt <= t);
  const p = progressOf(c, t);

  if (c.type === "sealed") {
    const opened = Boolean(c.openedAt);
    const canSeeBody = c.senderId === user.id || opened;
    return (
      <AppShell user={user} active="mailbox">
        <Link href="/mailbox?kind=sealed" className="muted">← Mailbox</Link>
        <h1 style={{ marginTop: 10 }}>{isRecipient && !opened ? "A sealed card" : c.title}</h1>
        <div className="card-meta">
          <span>from <Link className="link" href={`/p/${c.sender.handle}`}>{c.sender.displayName}</Link> · {c.senderCity}</span>
          <span>to <Link className="link" href={`/p/${c.recipient?.handle}`}>{c.recipient?.displayName}</Link> · {c.recipientCity}</span>
        </div>
        {isRecipient ? (
          <SealReveal cardId={c.id} opened={opened} orient={d.orient}
            front={<PostcardFront design={d} fromCity={c.senderCity} toCity={c.recipientCity} km={c.distanceKm} />}
            back={canSeeBody ? <PostcardBack design={d} stamp={s} body={c.body} signature={c.sender.displayName ?? ""} toName={c.recipient?.displayName ?? ""} toCity={c.recipientCity ?? ""} postmarkCity={c.senderCity} postmarkDate={c.sentAt} /> : null} />
        ) : (
          <FlipCard orient={d.orient} startFlipped
            front={<PostcardFront design={d} fromCity={c.senderCity} toCity={c.recipientCity} km={c.distanceKm} />}
            back={<PostcardBack design={d} stamp={s} body={c.body} signature={c.sender.displayName ?? ""} toName={c.recipient?.displayName ?? ""} toCity={c.recipientCity ?? ""} postmarkCity={c.senderCity} postmarkDate={c.sentAt} />} />
        )}
        <h2>Route</h2>
        <WorldMap cities={[c.senderCity, c.recipientCity ?? c.senderCity]} progress={arrived ? undefined : p} />
        <div className="kv"><span>Distance</span><div className="v">{fmtKm(c.distanceKm)}</div></div>
        <div className="kv"><span>Posted</span><div className="v">{fmtDate(c.sentAt)} from {c.senderCity}</div></div>
        <div className="kv"><span>{arrived ? "Arrived" : "Arrives"}</span><div className="v">{c.arrivesAt ? fmtDate(c.arrivesAt) : "—"}</div></div>
        {c.senderId === user.id && <div className="kv"><span>Opened</span><div className="v">{c.openedAt ? fmtDate(c.openedAt) : "not yet"}</div></div>}
        <div className="kv"><span>Postcard · stamp</span><div className="v">{d.name} · {s.name}</div></div>
        {isRecipient && opened && <div className="row-actions"><Link href={`/write?to=${c.sender.id}`} className="btn">Write back</Link></div>}
        {c.senderId === user.id && !arrived && <div className="row-actions"><RecallButton cardId={c.id} refund={postageCost(c.distanceKm)} /><span className="hint" style={{ margin: 0 }}>You can recall a card until it lands.</span></div>}
      </AppShell>
    );
  }

  // wandering
  const cities = routeCities(c).concat(c.status === "in_transit" && c.recipientCity ? [c.recipientCity] : []);
  const stats = routeStats(routeCities(c));
  const holderNow = isRecipient && arrived && c.status !== "frozen";
  return (
    <AppShell user={user} active="mailbox">
      <Link href="/mailbox?kind=wandering" className="muted">← Mailbox</Link>
      <h1 style={{ marginTop: 10 }}>{c.title}</h1>
      <div className="card-meta">
        <span>started by <Link className="link" href={`/p/${c.sender.handle}`}>{c.sender.displayName}</Link> in {c.senderCity}</span>
        <span>{c.status === "pooled" ? "waiting for a holder" : c.status === "in_transit" ? `en route to ${c.recipientCity}` : holderNow ? "in your hands" : `resting in ${c.recipientCity}`}</span>
      </div>
      <FlipCard orient={d.orient}
        front={<PostcardFront design={d} fromCity={c.senderCity} toCity={cities[cities.length - 1]} km={stats.totalKm} />}
        back={<PostcardBack design={d} stamp={s} body={c.body} signature={c.sender.displayName ?? ""} toName="whoever holds this" toCity={c.recipientCity ?? "the world"} postmarkCity={c.senderCity} postmarkDate={c.hops[0]?.addedAt ?? c.sentAt} />} />
      <div className="stats">
        <div className="stat"><b>{fmtNum(stats.totalKm)}</b><span>km travelled</span></div>
        <div className="stat"><b>{stats.uniqueCities}</b><span>unique cities</span></div>
        <div className="stat"><b>{c.hops.length}</b><span>signatures</span></div>
        <div className="stat"><b>{fmtDate(c.hops[0]?.addedAt ?? c.sentAt)}</b><span>first posted</span></div>
      </div>
      {holderNow && <><h2>Your move</h2><WanderingActions cardId={c.id} postage={user.postage} /></>}
      <h2>Route</h2>
      <WorldMap cities={cities} progress={c.status === "in_transit" ? p : undefined} />
      <h2>History</h2>
      {c.hops.map((h, i) => (
        <div key={h.id} className="hop">
          <div className="n">{i + 1}</div>
          <div>
            {h.removed ? <div className="removed">This line was removed.</div> : <div className="note">{h.note}</div>}
            <div className="by">
              <Link className="link" href={`/p/${h.holder.handle}`}>{h.holder.displayName}</Link> · {h.city} · {fmtDate(h.addedAt)}
              {h.holderId !== user.id && !h.removed && <> · <ReportButton hopId={h.id} cardId={c.id} /></>}
            </div>
          </div>
        </div>
      ))}
    </AppShell>
  );
}
