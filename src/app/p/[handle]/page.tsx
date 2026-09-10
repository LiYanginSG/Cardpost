import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { relationship } from "@/server/friends";
import { DESIGNS, STAMPS } from "@/lib/catalogue";
import { DesignArt, StampArt } from "@/components/art";
import { DesignThumb } from "@/components/postcard";
import { deliveryDays, fmtKm, haversineKm, postageCost } from "@/lib/geo";
import { fmtDate, fmtDateYear, fmtNum, initials } from "@/lib/format";
import { AcceptButton, RemoveButton } from "@/app/account/client";
import { ProfileAddButton } from "./add-button";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const me = await requireUser();
  const t = await now();
  const { handle } = await params;
  const p = await db.user.findUnique({ where: { handle: handle.toLowerCase() } });
  if (!p || !p.city || !p.displayName) notFound();
  const rel = await relationship(me.id, p.id);
  const km = haversineKm(me.city, p.city);
  const [fromThem, signed, sentCount, pendingRow] = await Promise.all([
    db.card.findMany({ where: { senderId: p.id, recipientId: me.id, type: "sealed", arrivesAt: { lte: t } }, orderBy: { arrivesAt: "desc" }, take: 20 }),
    db.wanderingHop.findMany({ where: { holderId: p.id }, include: { card: true }, orderBy: { addedAt: "desc" }, take: 20, distinct: ["cardId"] }),
    db.card.count({ where: { senderId: p.id } }),
    rel === "received" ? db.friendship.findFirst({ where: { userId: p.id, friendId: me.id, status: "pending" } }) : null,
  ]);

  return (
    <AppShell user={me} active="account">
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div className="avatar">{initials(p.displayName)}</div>
        <div><h1>{p.displayName}</h1><div className="muted">@{p.handle} · {p.city} · since {fmtDateYear(p.createdAt)}{p.isDemo ? " · demo account" : ""}</div></div>
      </div>

      <div className="stats">
        <div className="stat"><b>{rel === "self" ? "—" : fmtNum(km)}</b><span>km from you</span></div>
        <div className="stat"><b>{rel === "self" ? "—" : postageCost(km)}</b><span>postage to write</span></div>
        <div className="stat"><b>{rel === "self" ? "—" : deliveryDays(km)}</b><span>days to arrive</span></div>
        <div className="stat"><b>{sentCount}</b><span>cards sent</span></div>
      </div>

      <div className="row-actions">
        {rel === "self" && <Link href="/account" className="btn btn-sm">Your account</Link>}
        {rel === "friends" && <><Link href={`/write?to=${p.id}`} className="btn btn-sm btn-primary">Write to {p.displayName.split(" ")[0]}</Link><RemoveButton otherId={p.id} /></>}
        {rel === "none" && <ProfileAddButton handle={p.handle ?? ""} />}
        {rel === "sent" && <><span className="chip">Request pending</span><RemoveButton otherId={p.id} label="Cancel" /></>}
        {rel === "received" && pendingRow && <><AcceptButton id={pendingRow.id} /><RemoveButton otherId={p.id} label="Ignore" /></>}
      </div>
      {rel === "none" && <p className="hint">Sealed cards only go to people in your address book, so add them first. They'll need to accept.</p>}

      {fromThem.length > 0 && (
        <><h2>Cards they've sent you</h2>
          <div className="list">{fromThem.map((c) => (
            <Link key={c.id} href={`/card/${c.id}`} className="row"><DesignThumb designId={c.designId} /><div className="t"><b>{c.openedAt ? c.title : "Sealed card"}</b><span>{fmtKm(c.distanceKm)} · arrived {fmtDate(c.arrivesAt ?? c.sentAt)}</span></div><div className="r">{!c.openedAt && <span className="unread" />}</div></Link>
          ))}</div></>
      )}

      <h2>Wandering cards they've signed</h2>
      {signed.length === 0 && <p className="muted">None yet.</p>}
      <div className="list">{signed.map((h) => (
        <div key={h.id} className="row"><DesignThumb designId={h.card.designId} /><div className="t"><b>{h.card.title}</b><span>signed in {h.city} · {fmtDate(h.addedAt)}{h.card.senderId === p.id ? " · started it" : ""}</span></div><div className="r">{h.card.status === "in_transit" ? "travelling" : h.card.status}</div></div>
      ))}</div>

      <h2>Collection</h2>
      <p className="small" style={{ color: "var(--ink-2)" }}>{p.ownedDesigns.length} of {DESIGNS.length} postcards · {p.ownedStamps.length} of {STAMPS.length} stamps</p>
      <div className="grid">
        {DESIGNS.map((d) => { const o = p.ownedDesigns.includes(d.id); return (<div key={d.id} className={`tile ${o ? "" : "locked"}`}><div className="box"><DesignArt id={d.id} /></div><b>{d.name}</b>{o ? <span className="owned">owned</span> : <span className="notyet">not yet</span>}</div>); })}
      </div>
      <div className="grid">
        {STAMPS.map((s) => { const o = p.ownedStamps.includes(s.id); return (<div key={s.id} className={`tile ${o ? "" : "locked"}`}><div className="box stamp"><StampArt id={s.id} hue={s.hue} /></div><b>{s.name}</b>{o ? <span className="owned">owned</span> : <span className="notyet">not yet</span>}</div>); })}
      </div>
    </AppShell>
  );
}
