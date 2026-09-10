import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { BOOKS, DESIGNS, STAMPS } from "@/lib/catalogue";
import { DesignArt, StampArt } from "@/components/art";
import { BuyButton } from "./buy-button";
import { stripeConfigured } from "@/server/store";
import { nextPostageDate } from "@/server/postage";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store" };

export default async function StorePage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const user = await requireUser();
  const { paid } = await searchParams;
  const stripe = stripeConfigured();
  const designs = [...DESIGNS.filter((d) => d.featured), ...DESIGNS.filter((d) => !d.featured && d.cost > 0)];
  const stamps = [...STAMPS.filter((s) => s.featured), ...STAMPS.filter((s) => !s.featured && s.cost > 0)];
  return (
    <AppShell user={user} active="store">
      <h1>Store</h1>
      <p className="sub">Postage buys delivery. Stamps and postcards are collectibles, bought with postage. Every design credits its artist.</p>
      {paid && <div className="ok">Thank you. Your postage lands as soon as the payment clears, usually within a minute.</div>}

      <h2>Postage</h2>
      <p className="small" style={{ color: "var(--ink-2)" }}>You have <b>{user.postage}</b>. Next free 12 arrive {fmtDate(nextPostageDate(user))}, up to 40.</p>
      <div className="books">
        {BOOKS.map((b) => (
          <div key={b.id} className="book">
            <b>{b.postage}</b>
            <small>{b.why}</small>
            <BuyButton kind="book" id={b.id} cost={b.label} canAfford />
          </div>
        ))}
      </div>
      {!stripe && <p className="hint">{process.env.NODE_ENV !== "production" || process.env.DEV_TIME_TRAVEL === "1" ? "Stripe isn't configured, so buying a book credits it directly in dev." : "Postage books are not on sale yet. Free postage keeps coming every Sunday."}</p>}

      <h2>Postcards · 40 to 60 postage</h2>
      <div className="grid">
        {designs.map((d) => {
          const owned = user.ownedDesigns.includes(d.id);
          return (
            <div key={d.id} className={`tile ${d.featured ? "featured" : ""}`}>
              <div className="box"><DesignArt id={d.id} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                {d.featured && <span className="owned" style={{ color: "var(--red)" }}>Featured</span>}
                <b>{d.name}</b>
                <span className="artist">by {d.artist} · {d.orient === "port" ? "portrait" : "landscape"}</span>
                <span className="note">{d.note}</span>
                <div className="price">{owned ? <span className="owned">In your collection</span> : <BuyButton kind="design" id={d.id} cost={d.cost} canAfford={user.postage >= d.cost} />}</div>
              </div>
            </div>
          );
        })}
      </div>

      <h2>Stamps · 20 to 30 postage</h2>
      <div className="grid">
        {stamps.map((s) => {
          const owned = user.ownedStamps.includes(s.id);
          return (
            <div key={s.id} className={`tile ${s.featured ? "featured" : ""}`}>
              <div className="box stamp"><StampArt id={s.id} hue={s.hue} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                {s.featured && <span className="owned" style={{ color: "var(--red)" }}>Featured</span>}
                <b>{s.name}</b>
                <span className="artist">by {s.artist}</span>
                <span className="note">{s.note}</span>
                <div className="price">{owned ? <span className="owned">In your collection</span> : <BuyButton kind="stamp" id={s.id} cost={s.cost} canAfford={user.postage >= s.cost} />}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
