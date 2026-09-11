import { redirect } from "next/navigation";
import { getUser, googleSignInEnabled } from "@/server/auth";
import { supabaseAuthConfigured } from "@/server/supabase";
import { LoginForm } from "./login-form";
import { inviterByCode, pendingInviteCode } from "@/server/invites";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; mode?: string }> }) {
  const u = await getUser();
  if (u) redirect("/");
  const { error, mode } = await searchParams;
  const code = await pendingInviteCode();
  const inviter = code ? await inviterByCode(code) : null;
  return (
    <div className="auth">
      <div className="stripe" />
      <div className="top">
        <div className="mark" />
        <h1>Cardpost</h1>
        <p>Slow mail. You write a card, it takes real days to arrive, and the person you wrote to can't see it until it lands.</p>
        {inviter && <div className="ok">You're joining through {inviter.displayName}'s invite. They'll be in your address book from the start.</div>}
        {error === "expired" && <div className="warn">That link has expired, was already used, or was opened in a different browser from the one that asked for it. Ask for a new one here.</div>}
        <LoginForm supabase={supabaseAuthConfigured()} google={googleSignInEnabled()} initialMode={mode === "create" ? "create" : mode === "link" ? "link" : mode === "forgot" ? "forgot" : "password"} />
      </div>
    </div>
  );
}
