import { AppShell } from "@/components/shell";
import { requireAdmin } from "@/server/admin";
import { getCatalogue } from "@/server/catalogue";
import { storageConfigured } from "@/server/storage";
import { DesignArt, StampArt } from "@/components/art";
import { ItemControls, NewDesignForm, NewStampForm } from "./forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catalogue admin" };

export default async function AdminPage() {
  const user = await requireAdmin();
  const cat = await getCatalogue();
  return (
    <AppShell user={user} active="account">
      <h1>Catalogue</h1>
      <p className="sub">Add postcards and stamps to the store. Artwork goes to Supabase Storage; the design is frozen onto every card that uses it, so retiring a design never breaks old mail.</p>
      {!storageConfigured() && <div className="warn">Supabase Storage isn't configured (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY). Uploads will be stored inline in the database instead, which is fine for testing but not for production.</div>}

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
