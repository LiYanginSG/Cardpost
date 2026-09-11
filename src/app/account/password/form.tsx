"use client";
import { useActionState } from "react";
import { setPasswordAction, type FormState } from "@/server/actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setPasswordAction, null);
  return (
    <form action={action} style={{ marginTop: 18 }}>
      <div className="field"><label htmlFor="password">New password (8+ characters)</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
      <div className="field"><label htmlFor="confirm">Type it again</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></div>
      {state?.error && <div className="warn">{state.error}</div>}
      {state?.ok && <div className="ok">{state.ok}</div>}
      <button className="btn btn-primary btn-block" disabled={pending} style={{ marginTop: 14 }}>{pending ? "Saving…" : "Save password"}</button>
    </form>
  );
}
