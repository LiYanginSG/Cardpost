import { redirect } from "next/navigation";
import { getUser } from "@/server/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const u = await getUser();
  if (u) redirect("/");
  const { error } = await searchParams;
  return (
    <div className="auth">
      <div className="stripe" />
      <div className="top">
        <div className="mark" />
        <h1>Cardpost</h1>
        <p>Slow mail. You write a card, it takes real days to arrive, and the person you wrote to can't see it until it lands.</p>
        <p>Sign in with an email link. No password to forget.</p>
        {error === "expired" && <div className="warn">That link has expired, was already used, or was opened in a different browser from the one that asked for it. Ask for a new one here.</div>}
        <LoginForm />
      </div>
    </div>
  );
}
