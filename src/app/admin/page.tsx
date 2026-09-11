import { AppShell } from "@/components/shell";
import { requireAdmin } from "@/server/admin";
import { getCatalogue } from "@/server/catalogue";
import { storageConfigured } from "@/server/storage";
import { DesignArt, StampArt } from "@/components/art";
import { ItemControls, NewDesignForm, NewStampForm } from "./forms";
import { DeletePersonButton } from "./people";
import { listPeople } from "@/server/people";
import { fmtDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catalogue admin" };

export default async function AdminPage() {
  const user = await requireAdmin();
  const [cat, people] = await Promise.all([getCatalogue(), listPeople()]);
  return (
    <AppShell user={user} active="account">
      <Link href="/settings" className="muted">← Settings</Link>
      <h1 style={{ marginTop: 10 }}>Catalogue</h1>
      <p className="sub">Add postcards and stamps to the store. Artwork goes to Supabase Storage; the design is frozen onto every card that uses it, so retiring a design never breaks old mail.</p>
      {!storageConfigured() && <div className="warn">Supabase Storage isn't configured (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY). Uploads will be stored inline in the database instead, which is fine for testing but not for production.</div>}

      <h2>People · {people.length}</h2>
      <p className="small" style={{ color: "var(--ink-2)" }}>Everyone with an account. Deleting removes their sign-in from Supabase as well. Deleting in Supabase alone also works; the app catches up within the hour.</p>
      {people.map((p) => (
        <div key={p.id} className="person">
          <Avatar name={p.displayName ?? p.email} url={p.avatarUrl} />
          <div className="t">
            <b>{p.handle ? <Link href={`/p/${p.handle}`}>{p.displayName}</Link> : <span>{p.email} · not set up yet</span>}</b>
            <span>{p.handle ? `@${p.handle} · ${p.city} · ` : ""}{p.email} · joined {fmtDate(p.createdAt)} · {p._count.sentCards} sent · {p.postage} postage</span>
          </div>
          {p.id !== user.id && <DeletePersonButton userId={p.id} label={p.displayName ?? p.email} />}
        </div>
      ))}

      <h2>New postcard</h2>
      <NewDesignForm />

      <h2>New stamp</h2>
      <NewStampForm />

      <h2>Postcards · {cat.designs.length}</h2>
      <div className="grid">
        {cat.designs.map((d) => (
          <div key={d.id} className={`tile ${d.active ? "" : "locked"}`} style={{ gridColumn: "1 / -1", flexDirection: "row", gap: 14 }}>
            <div className="box" style={{ width: 140, height: 94, flex: "none" }}><DesignArt design={d} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{d.name}</b> <span className="artist">by {d.artist} · {d.orient === "port" ? "portrait" : "landscape"} · {d.cost} postage · {d.artUrl ? "uploaded" : "built-in"}{d.featured ? " · featured" : ""}{d.active ? "" : " · retired"}</span>
              <div className="note">{d.note}</div>
              <ItemControls kind="design" id={d.id} active={d.active} featured={d.featured} cost={d.cost} />
            </div>
          </div>
        ))}
      </div>

      <h2>Stamps · {cat.stamps.length}</h2>
      <div className="grid">
        {cat.stamps.map((s) => (
          <div key={s.id} className={`tile ${s.active ? "" : "locked"}`} style={{ gridColumn: "1 / -1", flexDirection: "row", gap: 14 }}>
            <div className="box stamp" style={{ width: 90, height: 94, flex: "none" }}><StampArt stamp={s} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{s.name}</b> <span className="artist">by {s.artist} · {s.cost} postage · {s.artUrl ? "uploaded" : "built-in"}{s.featured ? " · featured" : ""}{s.active ? "" : " · retired"}</span>
              <div className="note">{s.note}</div>
              <ItemControls kind="stamp" id={s.id} active={s.active} featured={s.featured} cost={s.cost} />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
