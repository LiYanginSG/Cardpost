import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/auth";
import { supabaseAuthConfigured } from "@/server/supabase";
import { PasswordForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set password" };

/** Reached from a reset link, or from Account. Works before onboarding too, since a reset link may land here first. */
export default async function PasswordPage() {
  const u = await getUser();
  if (!u) redirect("/login?mode=forgot");
  if (!supabaseAuthConfigured()) redirect("/account");
  return (
    <div className="auth">
      <div className="stripe" />
      <div className="top">
        <div className="mark" />
        <h1>Set a password</h1>
        <p>For {u.email}. You'll use it to sign in from now on.</p>
        <PasswordForm />
        <p className="hint"><Link className="link" href="/">Back to Cardpost</Link></p>
      </div>
    </div>
  );
}
