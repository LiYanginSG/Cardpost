"use client";
import { useActionState, useState, useTransition } from "react";
import { forgotPasswordAction, googleSignInAction, loginAction, passwordSignInAction, passwordSignUpAction, type FormState } from "@/server/actions";

type Mode = "password" | "create" | "link" | "forgot";

export function LoginForm({ supabase, google, initialMode }: { supabase: boolean; google: boolean; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(supabase ? initialMode : "link");
  const [signIn, signInAction, p1] = useActionState<FormState, FormData>(passwordSignInAction, null);
  const [signUp, signUpAction, p2] = useActionState<FormState, FormData>(passwordSignUpAction, null);
  const [link, linkAction, p3] = useActionState<FormState, FormData>(loginAction, null);
  const [forgot, forgotAction, p4] = useActionState<FormState, FormData>(forgotPasswordAction, null);
  const [gPending, startGoogle] = useTransition();
  const [gError, setGError] = useState<string | null>(null);

  const Switch = () => (
    <p className="hint" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {mode !== "password" && <button type="button" className="link" onClick={() => setMode("password")}>Sign in with password</button>}
      {mode !== "create" && <button type="button" className="link" onClick={() => setMode("create")}>Create an account</button>}
      {mode !== "link" && <button type="button" className="link" onClick={() => setMode("link")}>Email me a link instead</button>}
      {mode !== "forgot" && mode !== "link" && <button type="button" className="link" onClick={() => setMode("forgot")}>Forgot password</button>}
    </p>
  );

  const GoogleButton = () =>
    google ? (
      <div style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-block" disabled={gPending} onClick={() => startGoogle(async () => { const r = await googleSignInAction(); if (r?.error) setGError(r.error); })}>
          {gPending ? "Opening Google…" : "Continue with Google"}
        </button>
        {gError && <div className="warn">{gError}</div>}
        <p className="hint" style={{ textAlign: "center" }}>or</p>
      </div>
    ) : null;

  if (mode === "link") {
    if (link?.ok === "sent") {
      return (
        <div style={{ marginTop: 22 }}>
          <div className="ok">Check your inbox for a sign-in link. Give it a minute, and check spam the first time.</div>
          {link.devLink && <div className="devbox"><b>Dev sign-in.</b> Your link:<br /><a className="link" href={link.devLink}>{link.devLink}</a></div>}
        </div>
      );
    }
    return (
      <form action={linkAction} style={{ marginTop: 22 }}>
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div>
        {link?.error && <div className="warn">{link.error}</div>}
        <button className="btn btn-primary btn-block" disabled={p3} style={{ marginTop: 14 }}>{p3 ? "Sending…" : "Send me a link"}</button>
        {supabase && <Switch />}
      </form>
    );
  }

  if (mode === "forgot") {
    return (
      <form action={forgotAction} style={{ marginTop: 22 }}>
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div>
        {forgot?.error && <div className="warn">{forgot.error}</div>}
        {forgot?.ok && <div className="ok">{forgot.ok}</div>}
        <button className="btn btn-primary btn-block" disabled={p4} style={{ marginTop: 14 }}>{p4 ? "Sending…" : "Send a reset link"}</button>
        <Switch />
      </form>
    );
  }

  if (mode === "create") {
    return (
      <div style={{ marginTop: 22 }}>
        <GoogleButton />
        <form action={signUpAction}>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div>
          <div className="field"><label htmlFor="password">Choose a password (8+ characters)</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
          {signUp?.error && <div className="warn">{signUp.error}</div>}
          {signUp?.ok && <div className="ok">{signUp.ok}</div>}
          <button className="btn btn-primary btn-block" disabled={p2} style={{ marginTop: 14 }}>{p2 ? "Creating…" : "Create account"}</button>
          <Switch />
        </form>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 22 }}>
      <GoogleButton />
      <form action={signInAction}>
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
        {signIn?.error && <div className="warn">{signIn.error}</div>}
        <button className="btn btn-primary btn-block" disabled={p1} style={{ marginTop: 14 }}>{p1 ? "Signing in…" : "Sign in"}</button>
        <Switch />
      </form>
    </div>
  );
}
