import Link from "next/link";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { listFriends, pendingRequests } from "@/server/friends";
import { phoneConfigured } from "@/server/phone";
import { nextPostageDate } from "@/server/postage";
import { getCatalogue } from "@/server/catalogue";
import { isAdmin } from "@/server/admin";
import { DesignArt, StampArt } from "@/components/art";
import { AcceptButton, AddFriend, PhoneVerify, ProfileForm, RemoveButton, SignOut, Toggle } from "./client";
import { fmtDate, fmtDateYear, fmtNum, initials } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const t = await now();
  const cat = await getCatalogue();
  const DESIGNS = cat.designs.filter((d) => d.active || user.ownedDesigns.includes(d.id));
  const STAMPS = cat.stamps.filter((s) => s.active || user.ownedStamps.includes(s.id));
  const [friends, pending, sent, received, opened, signed, kmSent] = await Promise.all([
    listFriends(user.id),
    pendingRequests(user.id),
    db.card.count({ where: { senderId: user.id } }),
    db.card.count({ where: { recipientId: user.id, type: "sealed", arrivesAt: { lte: t } } }),
    db.card.count({ where: { recipientId: user.id, type: "sealed", openedAt: { not: null } } }),
    db.wanderingHop.count({ where: { holderId: user.id, card: { senderId: { not: user.id } } } }),
    db.card.aggregate({ where: { senderId: user.id, type: "sealed" }, _sum: { distanceKm: true } }),
  ]);
  // Reply rate: of sealed cards you received and opened, how many senders you wrote back to afterwards.
  const repliedTo = await db.card.findMany({ where: { recipientId: user.id, type: "sealed", openedAt: { not: null } }, select: { senderId: true, openedAt: true } });
  let replies = 0;
  for (const r of repliedTo) if (await db.card.count({ where: { senderId: user.id, recipientId: r.senderId, sentAt: { gte: r.openedAt! } } })) replies++;

  return (
    <AppShell user={user} active="account">
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div className="avatar">{initials(user.displayName)}</div>
        <div><h1>{user.displayName}</h1><div className="muted">@{user.handle} · {user.city} · member since {fmtDateYear(user.createdAt)}</div></div>
      </div>

      <h2>Account</h2>
      <div className="kv"><span>Email</span><div className="v">{user.email}</div></div>
      <div className="kv"><span>Postage</span><div className="v">{user.postage} · next 12 on {fmtDate(nextPostageDate(user))}</div></div>
      <PhoneVerify verified={user.phoneVerified} devMode={!phoneConfigured()} />
      <div style={{ marginTop: 6 }}><ProfileForm displayName={user.displayName} city={user.city} /></div>

      <h2>Collection</h2>
      <p className="small" style={{ color: "var(--ink-2)" }}>{user.ownedDesigns.length} of {DESIGNS.length} postcards · {user.ownedStamps.length} of {STAMPS.length} stamps</p>
      <div className="grid">
        {DESIGNS.map((d) => { const o = user.ownedDesigns.includes(d.id); return (
          <div key={d.id} className={`tile ${o ? "" : "locked"}`}><div className="box"><DesignArt design={d} /></div><b>{d.name}</b><span className="artist">{d.artist}</span>{o ? <span className="owned">owned</span> : <span className="notyet">not yet</span>}</div>
        ); })}
      </div>
      <div className="grid">
        {STAMPS.map((s) => { const o = user.ownedStamps.includes(s.id); return (
          <div key={s.id} className={`tile ${o ? "" : "locked"}`}><div className="box stamp"><StampArt stamp={s} /></div><b>{s.name}</b><span className="artist">{s.artist}</span>{o ? <span className="owned">owned</span> : <span className="notyet">not yet</span>}</div>
        ); })}
      </div>

      <h2 id="address-book">Address book</h2>
      <p className="small" style={{ color: "var(--ink-2)" }}>Sealed cards only go to people here. That's the whole safety model.</p>
      <AddFriend />
      {pending.incoming.length > 0 && (
        <><div className="group">Wants to write to you</div>
          {pending.incoming.map((p) => (
            <div key={p.id} className="person"><div className="avatar">{initials(p.displayName)}</div><div className="t"><b><Link href={`/p/${p.handle}`}>{p.displayName}</Link></b><span>@{p.handle} · {p.city}</span></div><AcceptButton id={p.id} /><RemoveButton otherId={p.userId} label="Ignore" /></div>
          ))}</>
      )}
      {pending.outgoing.length > 0 && (
        <><div className="group">Waiting on them</div>
          {pending.outgoing.map((p) => (
            <div key={p.id} className="person"><div className="avatar">{initials(p.displayName)}</div><div className="t"><b><Link href={`/p/${p.handle}`}>{p.displayName}</Link></b><span>@{p.handle} · {p.city} · pending</span></div><RemoveButton otherId={p.userId} label="Cancel" /></div>
          ))}</>
      )}
      <div className="group">Friends · {friends.length}</div>
      {friends.length === 0 && <div className="empty"><b>Nobody yet.</b>Ask a friend for their handle. Yours is @{user.handle}.</div>}
      {friends.map((f) => (
        <div key={f.id} className="person"><div className="avatar">{initials(f.displayName)}</div><div className="t"><b><Link href={`/p/${f.handle}`}>{f.displayName}</Link></b><span>@{f.handle} · {f.city}</span></div><Link href={`/write?to=${f.id}`} className="btn btn-sm">Write</Link><RemoveButton otherId={f.id} /></div>
      ))}

      <h2>Postal record</h2>
      <div className="stats">
        <div className="stat"><b>{sent}</b><span>cards sent</span></div>
        <div className="stat"><b>{received}</b><span>sealed received</span></div>
        <div className="stat"><b>{opened ? Math.round((replies / opened) * 100) : 0}%</b><span>reply rate</span></div>
        <div className="stat"><b>{signed}</b><span>wandering signed</span></div>
        <div className="stat"><b>{fmtNum(kmSent._sum.distanceKm ?? 0)}</b><span>km posted</span></div>
      </div>

      <h2 id="preferences">Preferences</h2>
      <Toggle prefKey="openToWandering" value={user.openToWandering} label="Open to wandering mail" sub="Strangers' public cards can land with you. Needs a verified phone to post your own." />
      <Toggle prefKey="notifyOnArrival" value={user.notifyOnArrival} label="Email me when a card arrives" sub="The only message Cardpost ever sends. Nothing about cards in transit." />

      {isAdmin(user) && (
        <><h2>Admin</h2><p className="small" style={{ color: "var(--ink-2)" }}>You can add postcards and stamps to the store.</p><div className="row-actions"><Link href="/admin" className="btn btn-sm">Manage catalogue</Link></div></>
      )}
      <div style={{ marginTop: 28 }}><SignOut /></div>
    </AppShell>
  );
}
