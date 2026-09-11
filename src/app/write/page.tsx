import Link from "next/link";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { listFriends } from "@/server/friends";
import { wanderingSentToday } from "@/server/cards";
import { now } from "@/lib/clock";
import { Composer } from "./composer";
import { WANDERING_DAILY_LIMIT } from "@/lib/format";
import { getCatalogue } from "@/server/catalogue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Write" };

export default async function WritePage({ searchParams }: { searchParams: Promise<{ to?: string; kind?: string }> }) {
  const user = await requireUser();
  const t = await now();
  const sp = await searchParams;
  const [friends, sentToday, cat] = await Promise.all([listFriends(user.id), wanderingSentToday(user.id, t), getCatalogue()]);
  return (
    <AppShell user={user} active="write">
      <h1>Write a card</h1>
      <p className="sub">240 characters. It leaves today and arrives when the distance says so.</p>
      {friends.length === 0 && (
        <div className="warn">Your address book is empty, so sealed cards have nowhere to go. <Link className="link" href="/account#invite">Send someone your invite link</Link> or <Link className="link" href="/account#address-book">add a friend by handle</Link>.</div>
      )}
      <Composer
        user={{ id: user.id, displayName: user.displayName, city: user.city, postage: user.postage, ownedDesigns: user.ownedDesigns, ownedStamps: user.ownedStamps, activeDesign: user.activeDesign, activeStamp: user.activeStamp, openToWandering: user.openToWandering }}
        designs={cat.designs.filter((d) => user.ownedDesigns.includes(d.id))}
        stamps={cat.stamps.filter((s) => user.ownedStamps.includes(s.id))}
        friends={friends.map((f) => ({ id: f.id, displayName: f.displayName, city: f.city }))}
        initialTo={sp.to}
        initialKind={sp.kind === "wandering" ? "wandering" : "sealed"}
        nowIso={t.toISOString()}
        wanderingLeft={Math.max(0, WANDERING_DAILY_LIMIT - sentToday)}
      />
    </AppShell>
  );
}
