"use client";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { sendCardAction, type FormState } from "@/server/actions";
import type { Design, Stamp } from "@/lib/catalogue";
import { deliveryDays, haversineKm, postageCost, fmtKm } from "@/lib/geo";
import { MAX_BODY, MAX_TITLE, fmtDate } from "@/lib/format";
import { DesignArt, StampArt } from "@/components/art";
import { PostcardBack, PostcardFront } from "@/components/postcard";
import { FlipCard } from "@/components/flip-card";

type U = { id: string; displayName: string; city: string; postage: number; ownedDesigns: string[]; ownedStamps: string[]; activeDesign: string; activeStamp: string; openToWandering: boolean };
type F = { id: string; displayName: string; city: string };

export function Composer({ user, friends, designs, stamps, initialTo, initialKind, nowIso, wanderingLeft }: { user: U; friends: F[]; designs: Design[]; stamps: Stamp[]; initialTo?: string; initialKind: "sealed" | "wandering"; nowIso: string; wanderingLeft: number }) {
  const [kind, setKind] = useState<"sealed" | "wandering">(initialKind);
  const [designId, setDesign] = useState(designs.some((d) => d.id === user.activeDesign) ? user.activeDesign : designs[0]?.id ?? "classic");
  const [stampId, setStamp] = useState(stamps.some((s) => s.id === user.activeStamp) ? user.activeStamp : stamps[0]?.id ?? "house");
  const [to, setTo] = useState(initialTo && friends.some((f) => f.id === initialTo) ? initialTo : friends[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState<FormState, FormData>(sendCardAction, null);
  const [flying, setFlying] = useState(false);
  useEffect(() => { if (state?.error) setFlying(false); }, [state]);

  const recipient = friends.find((f) => f.id === to);
  const toCity = kind === "sealed" ? recipient?.city : undefined;
  const km = toCity ? haversineKm(user.city, toCity) : 0;
  const cost = kind === "sealed" ? (toCity ? postageCost(km) : 0) : null; // wandering cost depends on the random recipient
  const days = toCity ? deliveryDays(km) : null;
  const arrives = days ? fmtDate(new Date(new Date(nowIso).getTime() + days * 86_400_000)) : null;
  const d = useMemo(() => designs.find((x) => x.id === designId) ?? designs[0], [designs, designId]);
  const st = useMemo(() => stamps.find((x) => x.id === stampId) ?? stamps[0], [stamps, stampId]);
  const owned = designs;
  const ownedStamps = stamps;
  const previewTitle = title || body.split(/[.!?\n]/)[0].slice(0, MAX_TITLE);
  const wanderingBlocked = kind === "wandering" && !user.openToWandering;
  const canSend = body.trim().length > 0 && (kind === "sealed" ? Boolean(recipient) && user.postage >= (cost ?? 0) : !wanderingBlocked && title.trim().length > 0 && wanderingLeft > 0 && user.postage >= 1);

  return (
    <form action={action} onSubmit={() => setFlying(true)}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="designId" value={designId} />
      <input type="hidden" name="stampId" value={stampId} />
      <input type="hidden" name="recipientId" value={kind === "sealed" ? to : ""} />

      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={kind === "sealed"} className={kind === "sealed" ? "on" : ""} onClick={() => setKind("sealed")}>Sealed · private</button>
        <button type="button" role="tab" aria-selected={kind === "wandering"} className={kind === "wandering" ? "on" : ""} onClick={() => setKind("wandering")}>Wandering · public</button>
      </div>
      <p className="hint">{kind === "sealed" ? "One recipient from your address book. Only they can read it, and only once it lands." : "Goes to a random stranger who has opted in. They can sign it and send it on. Checked before it leaves."}</p>

      <h2>Preview</h2>
      <div className={flying ? "fly" : ""} style={{ display: "contents" }}>
      <FlipCard key={d.orient} orient={d.orient} wrapClass={flying ? "fly" : ""}
        front={<PostcardFront design={d} />}
        back={<PostcardBack design={d} stamp={st} body={body || "Your message will appear here, in your own hand."} signature={user.displayName} toName={kind === "sealed" ? recipient?.displayName ?? "—" : "whoever holds this"} toCity={kind === "sealed" ? toCity ?? "" : "the world"} postmarkCity={user.city} postmarkDate={nowIso} fromCity={user.city} km={km || undefined} />} />
      </div>

      <h2>Postcard</h2>
      <div className="scroller" role="radiogroup" aria-label="Postcard design">
        {owned.map((x) => (
          <button type="button" key={x.id} role="radio" aria-checked={designId === x.id} className={`pick ${designId === x.id ? "on" : ""}`} onClick={() => setDesign(x.id)}>
            <div className="box"><DesignArt design={x} /></div>
            <small>{x.name}</small>
          </button>
        ))}
        <Link href="/store" className="pick more">More in store →</Link>
      </div>

      <h2>Stamp</h2>
      <div className="scroller" role="radiogroup" aria-label="Stamp">
        {ownedStamps.map((x) => (
          <button type="button" key={x.id} role="radio" aria-checked={stampId === x.id} className={`pick ${stampId === x.id ? "on" : ""}`} onClick={() => setStamp(x.id)}>
            <div className="box stamp"><StampArt stamp={x} /></div>
            <small>{x.name}</small>
          </button>
        ))}
        <Link href="/store" className="pick more">More in store →</Link>
      </div>

      <h2>Address</h2>
      {kind === "sealed" ? (
        <div className="field">
          <label htmlFor="to">To</label>
          <select id="to" value={to} onChange={(e) => setTo(e.target.value)} disabled={friends.length === 0}>
            {friends.length === 0 && <option value="">No one in your address book yet</option>}
            {friends.map((f) => <option key={f.id} value={f.id}>{f.displayName} · {f.city}</option>)}
          </select>
        </div>
      ) : wanderingBlocked ? (
        <div className="warn">
          To post to the wandering pool, open yourself to wandering mail first. <Link className="link" href="/account#preferences">Do that in Account</Link>.
        </div>
      ) : (
        <p className="hint">A random stranger who has opted in. You can't choose who, and neither can anyone else. {wanderingLeft} of 3 wandering cards left today.</p>
      )}

      <div className="field">
        <label htmlFor="title">Title {kind === "sealed" ? "(optional)" : "(shown on the wall)"}</label>
        <input id="title" name="title" maxLength={MAX_TITLE} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "sealed" ? previewTitle || "From the first sentence" : "Tell me one thing about where you are"} required={kind === "wandering"} />
      </div>
      <div className="field">
        <label htmlFor="body">Message</label>
        <textarea id="body" name="body" maxLength={MAX_BODY} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Dear…" required />
        <div className="count">{body.length}/{MAX_BODY}</div>
      </div>

      <h2>Cost</h2>
      <div className="kv"><span>Distance</span><div className="v">{kind === "sealed" ? (toCity ? fmtKm(km) : "—") : "depends on who it finds"}</div></div>
      <div className="kv"><span>Arrives</span><div className="v">{kind === "sealed" ? (arrives ? `${arrives} · ${days} days` : "—") : "2 to 14 days"}</div></div>
      <div className="kv"><span>Postage</span><div className="v">{kind === "sealed" ? (cost ?? "—") : "1 to 8"} · you have {user.postage}</div></div>

      {state?.error && <div className="warn">{state.error}</div>}
      <button className="btn btn-primary btn-block" disabled={pending || !canSend} style={{ marginTop: 16 }}>
        {pending ? "Posting…" : kind === "sealed" ? `Post it${cost ? ` · ${cost} postage` : ""}` : "Send it wandering"}
      </button>
      <p className="hint">There is no deliver-now. You can recall a card from your outbox until the day it lands.</p>
    </form>
  );
}
