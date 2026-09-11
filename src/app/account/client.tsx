"use client";
import { useActionState, useState, useTransition } from "react";
import { acceptFriendAction, addFriendAction, removeFriendAction, setPrefAction, signOutAction, updateProfileAction, type FormState } from "@/server/actions";
import { CityPicker } from "@/components/city-picker";

export function ProfileForm({ displayName, city }: { displayName: string; city: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, null);
  return (
    <form action={action}>
      <div className="field"><label htmlFor="displayName">Name printed on cards</label><input id="displayName" name="displayName" defaultValue={displayName} maxLength={40} required /></div>
      <div className="field"><label htmlFor="city">Registered posting city</label>
        <CityPicker defaultValue={city} />
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
