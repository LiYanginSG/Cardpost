import Link from "next/link";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { now } from "@/lib/clock";
import { sealedInbox, sealedOutbox, wanderingInbox, wanderingOutbox, type CardFull } from "@/server/cards";
import { CardList, TrackRow } from "@/components/card-rows";
import { PostcardBack, PostcardFront } from "@/components/postcard";
import { SealReveal } from "@/components/seal-reveal";
import { FlipCard } from "@/components/flip-card";
import { WanderingActions } from "@/components/wandering-actions";
import { designById } from "@/lib/catalogue";
import { fmtDate } from "@/lib/format";
import { fmtKm } from "@/lib/geo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mailbox" };

type SP = { kind?: string; box?: string; view?: string; sent?: string };

export default async function Mailbox({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const t = await now();
  const sp = await searchParams;
  const kind = sp.kind === "wandering" ? "wandering" : "sealed";
  const box = sp.box === "out" ? "out" : "in";
  const cards: CardFull[] =
    kind === "sealed" ? (box === "in" ? await sealedInbox(user.id, t) : await sealedOutbox(user.id)) : box === "in" ? await wanderingInbox(user.id, t) : await wanderingOutbox(user.id);
  const view = sp.view === "list" || sp.view === "card" ? sp.view : cards.length > 20 ? "list" : "card";
  const q = (o: Partial<SP>) => `/mailbox?kind=${o.kind ?? kind}&box=${o.box ?? box}${o.view ? `&view=${o.view}` : ""}`;
  const showToggle = box === "in";

  return (
    <AppShell user={user} active="mailbox">
      <h1>Mailbox</h1>
      <p className="sub">{kind === "sealed" ? "Private cards from people in your address book. Nothing shows up until it lands." : "Public cards passed hand to hand. Sign one and send it further, or let it go."}</p>
      <div className="seg" role="tablist">
        <Link role="tab" aria-selected={kind === "sealed"} className={kind === "sealed" ? "on" : ""} href={q({ kind: "sealed" })}>Sealed</Link>
        <Link role="tab" aria-selected={kind === "wandering"} className={kind === "wandering" ? "on" : ""} href={q({ kind: "wandering" })}>Wandering</Link>
      </div>
      <div className="chips">
        <Link className={`chip ${box === "in" ? "on" : ""}`} href={q({ box: "in" })}>Inbox</Link>
        <Link className={`chip ${box === "out" ? "on" : ""}`} href={q({ box: "out" })}>Outbox</Link>
        <span className="spacer" />
        {showToggle && (
          <>
            <Link className={`chip ${view === "card" ? "on" : ""}`} href={q({ view: "card" })}>Cards</Link>
            <Link className={`chip ${view === "list" ? "on" : ""}`} href={q({ view: "list" })}>List</Link>
          </>
        )}
      </div>
      {sp.sent && <div className="ok">Posted. It's on its way; you'll see it move below. The recipient sees nothing until it lands.</div>}

      {cards.length === 0 && <Empty kind={kind} box={box} />}

      {box === "out" && cards.length > 0 && <div className="list">{cards.map((c) => <TrackRow key={c.id} card={c} now={t} />)}</div>}

      {box === "in" && view === "list" && cards.length > 0 && <CardList cards={cards} now={t} mode="in" />}

      {box === "in" && view === "card" && cards.map((c) => (
        <article key={c.id} className="item" style={{ marginTop: 26 }}>
          {kind === "sealed" ? <SealedItem card={c} /> : <WanderingItem card={c} postage={user.postage} />}
        </article>
      ))}
    </AppShell>
  );
}

function SealedItem({ card: c }: { card: CardFull }) {
  const opened = Boolean(c.openedAt);
  const d = designById(c.designId);
  return (
    <>
      <h3>{opened ? c.title : "A sealed card"}</h3>
      <div className="card-meta">
        <span>from <Link className="link" href={`/p/${c.sender.handle}`}>{c.sender.displayName}</Link> · {c.senderCity}</span>
        <span>{fmtKm(c.distanceKm)} · arrived {fmtDate(c.arrivesAt ?? c.sentAt)}</span>
      </div>
      <SealReveal
        cardId={c.id}
        opened={opened}
        orient={d.orient}
        front={<PostcardFront designId={c.designId} fromCity={c.senderCity} toCity={c.recipientCity} km={c.distanceKm} />}
        back={opened ? <PostcardBack designId={c.designId} stampId={c.stampId} body={c.body} signature={c.sender.displayName ?? ""} toName={c.recipient?.displayName ?? ""} toCity={c.recipientCity ?? ""} postmarkCity={c.senderCity} postmarkDate={c.sentAt} /> : null}
      />
      {opened && <div className="row-actions"><Link href={`/write?to=${c.sender.id}`} className="btn btn-sm">Write back</Link><Link href={`/card/${c.id}`} className="btn btn-sm btn-ghost">Open</Link></div>}
    </>
  );
}

function WanderingItem({ card: c, postage }: { card: CardFull; postage: number }) {
  const d = designById(c.designId);
  const last = c.hops[c.hops.length - 1];
  return (
    <>
      <h3>{c.title}</h3>
      <div className="card-meta">
        <span>started in {c.senderCity} · {c.hops.length} signature{c.hops.length === 1 ? "" : "s"}</span>
        <span>landed {fmtDate(c.arrivesAt ?? c.sentAt)}</span>
      </div>
      <FlipCard
        orient={d.orient}
        front={<PostcardFront designId={c.designId} fromCity={last?.city ?? c.senderCity} toCity={c.recipientCity} km={c.distanceKm} />}
        back={<PostcardBack designId={c.designId} stampId={c.stampId} body={c.body} signature={c.sender.displayName ?? ""} toName="whoever holds this" toCity={c.recipientCity ?? ""} postmarkCity={c.senderCity} postmarkDate={c.hops[0]?.addedAt ?? c.sentAt} />}
      />
      <Link href={`/card/${c.id}`} className="link small">Read its history and route</Link>
      <WanderingActions cardId={c.id} postage={postage} />
    </>
  );
}

function Empty({ kind, box }: { kind: string; box: string }) {
  if (kind === "sealed" && box === "in") return <div className="empty"><b>Nothing has landed yet.</b>Cards from friends appear here on the day they arrive, and not a moment before.</div>;
  if (kind === "sealed" && box === "out") return <div className="empty"><b>You haven't sent a card.</b><Link className="link" href="/write">Write one</Link> to someone in your address book.</div>;
  if (kind === "wandering" && box === "in") return <div className="empty"><b>No wandering card in your hands.</b>Open yourself to wandering mail in <Link className="link" href="/account">Account</Link> and one will find you.</div>;
  return <div className="empty"><b>Nothing travelling.</b>Cards you post or sign will show up here while they're still moving.</div>;
}
