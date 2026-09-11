import Link from "next/link";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { listFriends, pendingRequests } from "@/server/friends";
import { getCatalogue } from "@/server/catalogue";
import { ensureInviteCode, inviteStats, inviteUrl, INVITE_BONUS } from "@/server/invites";
import { DesignArt, StampArt } from "@/components/art";
import { Avatar } from "@/components/avatar";
import { IconSettings } from "@/components/icons";
import { AcceptButton, AddFriend, RemoveButton } from "./client";
import { InviteBox } from "./invite";
import { fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const t = await now();
  const cat = await getCatalogue();
  const DESIGNS = cat.designs.filter((d) => d.active || user.ownedDesigns.includes(d.id));
  const STAMPS = cat.stamps.filter((s) => s.active || user.ownedStamps.includes(s.id));
  const [inviteCode, invites, friends, pending, sent, received, opened, signed, kmSent, repliedTo, mySent] = await Promise.all([
    ensureInviteCode(user),
    inviteStats(user.id),
    listFriends(user.id),
    pendingRequests(user.id),
    db.card.count({ where: { senderId: user.id } }),
    db.card.count({ where: { recipientId: user.id, type: "sealed", arrivesAt: { lte: t } } }),
    db.card.count({ where: { recipientId: user.id, type: "sealed", openedAt: { not: null } } }),
    db.wanderingHop.count({ where: { holderId: user.id, card: { senderId: { not: user.id } } } }),
    db.card.aggregate({ where: { senderId: user.id, type: "sealed" }, _sum: { distanceKm: true } }),
    db.card.findMany({ where: { recipientId: user.id, type: "sealed", openedAt: { not: null } }, select: { senderId: true, openedAt: true } }),
    db.card.findMany({ where: { senderId: user.id, type: "sealed" }, select: { recipientId: true, sentAt: true } }),
  ]);
  const replies = repliedTo.filter((r) => mySent.some((c) => c.recipientId === r.senderId && c.sentAt >= r.openedAt!)).length;

  return (
    <AppShell user={user} active="account">
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar name={user.displayName} url={user.avatarUrl} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}><h1>{user.displayName}</h1><div className="muted">@{user.handle} · {user.city}</div></div>
        <Link href="/settings" className="btn btn-sm btn-ghost" aria-label="Settings"><IconSettings /> Settings</Link>
      </div>

      <div className="stats">
        <div className="stat"><b>{sent}</b><span>cards sent</span></div>
        <div className="stat"><b>{received}</b><span>sealed received</span></div>
        <div className="stat"><b>{opened ? Math.round((replies / opened) * 100) : 0}%</b><span>reply rate</span></div>
        <div className="stat"><b>{signed}</b><span>wandering signed</span></div>
        <div className="stat"><b>{fmtNum(kmSent._sum.distanceKm ?? 0)}</b><span>km posted</span></div>
      </div>

      <h2 id="invite">Invite friends</h2>
      <p className="small" style={{ color: "var(--ink-2)" }}>{invites.joined} joined through your link{invites.earned ? ` · ${invites.earned} postage earned` : ""}.</p>
      <InviteBox url={inviteUrl(inviteCode)} bonus={INVITE_BONUS} />

      <h2 id="address-book">Address book</h2>
      <p className="small" style={{ color: "var(--ink-2)" }}>Sealed cards only go to people here. That's the whole safety model.</p>
      <AddFriend />
      {pending.incoming.length > 0 && (
        <><div className="group">Wants to write to you</div>
          {pending.incoming.map((p) => (
            <div key={p.id} className="person"><Avatar name={p.displayName} url={p.avatarUrl} /><div className="t"><b><Link href={`/p/${p.handle}`}>{p.displayName}</Link></b><span>@{p.handle} · {p.city}</span></div><AcceptButton id={p.id} /><RemoveButton otherId={p.userId} label="Ignore" /></div>
          ))}</>
      )}
      {pending.outgoing.length > 0 && (
        <><div className="group">Waiting on them</div>
          {pending.outgoing.map((p) => (
            <div key={p.id} className="person"><Avatar name={p.displayName} url={p.avatarUrl} /><div className="t"><b><Link href={`/p/${p.handle}`}>{p.displayName}</Link></b><span>@{p.handle} · {p.city} · pending</span></div><RemoveButton otherId={p.userId} label="Cancel" /></div>
          ))}</>
      )}
      <div className="group">Friends · {friends.length}</div>
      {friends.length === 0 && <div className="empty"><b>Nobody yet.</b>Share your <Link className="link" href="#invite">invite link</Link>, or add a friend by handle. Yours is @{user.handle}.</div>}
      {friends.map((f, i) => (
        <div key={f.id} className="person" style={{ ["--i" as string]: Math.min(i, 8) }}><Avatar name={f.displayName} url={f.avatarUrl} /><div className="t"><b><Link href={`/p/${f.handle}`}>{f.displayName}</Link></b><span>@{f.handle} · {f.city}</span></div><Link href={`/write?to=${f.id}`} className="btn btn-sm">Write</Link><RemoveButton otherId={f.id} /></div>
      ))}

      <h2>Collection</h2>
      <p className="small" style={{ color: "var(--ink-2)" }}>{user.ownedDesigns.length} of {DESIGNS.length} postcards · {user.ownedStamps.length} of {STAMPS.length} stamps · <Link className="link" href="/store">visit the store</Link></p>
      <div className="grid">
        {DESIGNS.map((d, i) => { const o = user.ownedDesigns.includes(d.id); return (
          <div key={d.id} className={`tile ${o ? "" : "locked"}`} style={{ ["--i" as string]: Math.min(i, 8) }}><div className="box"><DesignArt design={d} /></div><b>{d.name}</b><span className="artist">{d.artist}</span>{o ? <span className="owned">owned</span> : <span className="notyet">not yet</span>}</div>
        ); })}
      </div>
      <div className="grid">
        {STAMPS.map((s, i) => { const o = user.ownedStamps.includes(s.id); return (
          <div key={s.id} className={`tile ${o ? "" : "locked"}`} style={{ ["--i" as string]: Math.min(i, 8) }}><div className="box stamp"><StampArt stamp={s} /></div><b>{s.name}</b><span className="artist">{s.artist}</span>{o ? <span className="owned">owned</span> : <span className="notyet">not yet</span>}</div>
        ); })}
      </div>
    </AppShell>
  );
}
