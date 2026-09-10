"use client";
import { useActionState, useState, useTransition } from "react";
import { acceptFriendAction, addFriendAction, checkPhoneAction, removeFriendAction, setPrefAction, signOutAction, startPhoneAction, updateProfileAction, type FormState } from "@/server/actions";
import { CITIES } from "@/lib/cities";

export function ProfileForm({ displayName, city }: { displayName: string; city: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, null);
  return (
    <form action={action}>
      <div className="field"><label htmlFor="displayName">Name printed on cards</label><input id="displayName" name="displayName" defaultValue={displayName} maxLength={40} required /></div>
      <div className="field"><label htmlFor="city">Registered posting city</label>
        <select id="city" name="city" defaultValue={city}>{CITIES.map((c) => <option key={c.name} value={c.name}>{c.name} · {c.cc}</option>)}</select>
      </div>
      <p className="hint">Changing city changes every distance from now on. Cards already in the post keep the route they left with.</p>
      {state?.error && <div className="warn">{state.error}</div>}
      {state?.ok && <div className="ok">{state.ok}</div>}
      <div className="row-actions"><button className="btn btn-sm" disabled={pending}>{pending ? "Saving…" : "Save"}</button></div>
    </form>
  );
}

export function Toggle({ label, sub, prefKey, value }: { label: string; sub: string; prefKey: "openToWandering" | "notifyOnArrival"; value: boolean }) {
  const [on, setOn] = useState(value);
  const [pending, start] = useTransition();
  return (
    <div className="toggle">
      <div><div>{label}</div><div className="sub">{sub}</div></div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} disabled={pending} onClick={() => { const v = !on; setOn(v); start(() => setPrefAction(prefKey, v)); }} />
    </div>
  );
}

export function PhoneVerify({ verified, devMode }: { verified: boolean; devMode: boolean }) {
  const [s1, startAction, p1] = useActionState<FormState, FormData>(startPhoneAction, null);
  const [s2, checkAction, p2] = useActionState<FormState, FormData>(checkPhoneAction, null);
  if (verified || s2?.ok === "verified") return <div className="kv"><span>Phone</span><div className="v">verified ✓</div></div>;
  if (s1?.ok) {
    return (
      <form action={checkAction}>
        <input type="hidden" name="phone" value={s1.ok} />
        <div className="field"><label htmlFor="code">Code sent to {s1.ok}</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required placeholder={devMode ? "any 4+ digits in dev" : "123456"} /></div>
        {s2?.error && <div className="warn">{s2.error}</div>}
        <div className="row-actions"><button className="btn btn-sm" disabled={p2}>{p2 ? "Checking…" : "Verify"}</button></div>
      </form>
    );
  }
  return (
    <form action={startAction}>
      <div className="field"><label htmlFor="phone">Phone number (needed only for wandering mail)</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+65 9123 4567" required /></div>
      <p className="hint">Never shown to anyone. Verification makes a ban cost something, which is the only reason we ask.</p>
      {s1?.error && <div className="warn">{s1.error}</div>}
      <div className="row-actions"><button className="btn btn-sm" disabled={p1}>{p1 ? "Sending…" : "Send code"}</button></div>
    </form>
  );
}

export function AddFriend() {
  const [state, action, pending] = useActionState<FormState, FormData>(addFriendAction, null);
  return (
    <form action={action}>
      <div className="field"><label htmlFor="handle">Add by handle</label>
        <div style={{ display: "flex", gap: 8 }}><input id="handle" name="handle" placeholder="@amylau" required style={{ flex: 1 }} /><button className="btn" disabled={pending}>{pending ? "…" : "Add"}</button></div>
      </div>
      {state?.error && <div className="warn">{state.error}</div>}
      {state?.ok && <div className="ok">{state.ok} They'll see it in their address book and can accept.</div>}
    </form>
  );
}

export function AcceptButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(() => acceptFriendAction(id))}>{pending ? "…" : "Accept"}</button>;
}

export function RemoveButton({ otherId, label = "Remove" }: { otherId: string; label?: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => { if (confirm("Remove from your address book?")) start(() => removeFriendAction(otherId)); }}>{pending ? "…" : label}</button>;
}

export function SignOut() {
  return <form action={signOutAction}><button className="btn btn-ghost">Sign out</button></form>;
}
