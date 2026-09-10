"use client";
import { useActionState, useState, useTransition } from "react";
import { createDesignAction, createStampAction, grantToEveryoneAction, updateItemAction } from "@/server/admin-actions";
import type { FormState } from "@/server/actions";

export function NewDesignForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createDesignAction, null);
  return (
    <form action={action} encType="multipart/form-data">
      <div className="field"><label htmlFor="d-art">Artwork file (SVG, PNG, JPEG or WebP, under 4 MB)</label><input id="d-art" name="art" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" required /></div>
      <p className="hint">Landscape art should be 3:2 (for example 1500×1000), portrait 2:3. The card front is filled edge to edge; everywhere else the art is letterboxed, never stretched.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="field"><label htmlFor="d-name">Name</label><input id="d-name" name="name" required maxLength={40} placeholder="Monsoon" /></div>
        <div className="field"><label htmlFor="d-artist">Artist</label><input id="d-artist" name="artist" required maxLength={40} placeholder="Priya Nair" /></div>
        <div className="field"><label htmlFor="d-cost">Cost in postage</label><input id="d-cost" name="cost" type="number" min={0} max={200} defaultValue={40} required /></div>
        <div className="field"><label htmlFor="d-orient">Orientation</label><select id="d-orient" name="orient" defaultValue="land"><option value="land">Landscape 3:2</option><option value="port">Portrait 2:3</option></select></div>
      </div>
      <div className="field"><label htmlFor="d-note">One line about it (shown in the store)</label><input id="d-note" name="note" maxLength={160} placeholder="Rain over a green coastline." /></div>
      <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}><input type="checkbox" name="featured" /> Feature at the top of the store</label>
      {state?.error && <div className="warn">{state.error}</div>}
      {state?.ok && <div className="ok">{state.ok}</div>}
      <div className="row-actions"><button className="btn btn-primary" disabled={pending}>{pending ? "Uploading…" : "Add postcard"}</button></div>
    </form>
  );
}

export function NewStampForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createStampAction, null);
  return (
    <form action={action} encType="multipart/form-data">
      <div className="field"><label htmlFor="s-art">Artwork file (square-ish, shown inside the perforated frame)</label><input id="s-art" name="art" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" required /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="field"><label htmlFor="s-name">Name</label><input id="s-name" name="name" required maxLength={40} placeholder="Crane" /></div>
        <div className="field"><label htmlFor="s-artist">Artist</label><input id="s-artist" name="artist" required maxLength={40} placeholder="Hana Mori" /></div>
        <div className="field"><label htmlFor="s-cost">Cost in postage</label><input id="s-cost" name="cost" type="number" min={0} max={200} defaultValue={20} required /></div>
        <div className="field"><label htmlFor="s-hue">Frame tint (hue 0–360)</label><input id="s-hue" name="hue" type="number" min={0} max={360} defaultValue={206} /></div>
      </div>
      <div className="field"><label htmlFor="s-note">One line about it</label><input id="s-note" name="note" maxLength={160} placeholder="One bird, one line." /></div>
      <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}><input type="checkbox" name="featured" /> Feature at the top of the store</label>
      {state?.error && <div className="warn">{state.error}</div>}
      {state?.ok && <div className="ok">{state.ok}</div>}
      <div className="row-actions"><button className="btn btn-primary" disabled={pending}>{pending ? "Uploading…" : "Add stamp"}</button></div>
    </form>
  );
}

export function ItemControls({ kind, id, active, featured, cost }: { kind: "design" | "stamp"; id: string; active: boolean; featured: boolean; cost: number }) {
  const [pending, start] = useTransition();
  const [c, setC] = useState(cost);
  return (
    <div className="row-actions" style={{ marginTop: 6 }}>
      <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => start(() => updateItemAction(kind, id, { active: !active }))}>{active ? "Retire" : "Put back on sale"}</button>
      <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => start(() => updateItemAction(kind, id, { featured: !featured }))}>{featured ? "Unfeature" : "Feature"}</button>
      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <input type="number" min={0} max={200} value={c} onChange={(e) => setC(Number(e.target.value))} style={{ width: 64, border: "1px solid var(--rule)", padding: "4px 6px", fontSize: 11 }} aria-label="Cost" />
        <button type="button" className="btn btn-sm btn-ghost" disabled={pending || c === cost} onClick={() => start(() => updateItemAction(kind, id, { cost: c }))}>Set cost</button>
      </span>
      <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => { if (confirm("Give this to every existing account for free?")) start(() => grantToEveryoneAction(kind, id)); }}>Gift to everyone</button>
    </div>
  );
}
