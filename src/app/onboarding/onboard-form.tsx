"use client";
import { useActionState } from "react";
import { onboardAction, type FormState } from "@/server/actions";
import { CITIES } from "@/lib/cities";

export function OnboardForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(onboardAction, null);
  const suggested = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  return (
    <form action={action} style={{ marginTop: 18 }}>
      <div className="field">
        <label htmlFor="displayName">Name printed on your cards</label>
        <input id="displayName" name="displayName" required maxLength={40} placeholder="Amy Lau" />
      </div>
      <div className="field">
        <label htmlFor="handle">Handle (how friends find you)</label>
        <input id="handle" name="handle" required defaultValue={suggested} pattern="[a-zA-Z0-9_]{3,20}" placeholder="amylau" />
      </div>
      <div className="field">
        <label htmlFor="city">Posting city</label>
        <select id="city" name="city" required defaultValue="">
          <option value="" disabled>Choose a city</option>
          {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name} · {c.cc}</option>)}
        </select>
      </div>
      {state?.error && <div className="warn">{state.error}</div>}
      <button className="btn btn-primary btn-block" disabled={pending} style={{ marginTop: 16 }}>{pending ? "Saving…" : "Open my mailbox"}</button>
      <p className="hint">You start with 24 postage and the house postcard. 12 more postage arrives every Sunday.</p>
    </form>
  );
}
