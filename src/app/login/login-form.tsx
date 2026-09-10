"use client";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/server/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, null);
  if (state?.ok === "sent") {
    return (
      <div style={{ marginTop: 22 }}>
        <div className="ok">Check your inbox for a sign-in link. Give it a minute, and check spam the first time.</div>
        {state.devLink && (
          <div className="devbox">
            <b>No email provider configured.</b> Your link:<br />
            <a className="link" href={state.devLink}>{state.devLink}</a>
          </div>
        )}
      </div>
    );
  }
  return (
    <form action={action} style={{ marginTop: 22 }}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      {state?.error && <div className="warn">{state.error}</div>}
      <button className="btn btn-primary btn-block" disabled={pending} style={{ marginTop: 14 }}>{pending ? "Sending…" : "Send me a link"}</button>
      <p className="hint">By signing in you agree to write nicely to strangers. Cards to friends are private; wandering cards are public.</p>
    </form>
  );
}
