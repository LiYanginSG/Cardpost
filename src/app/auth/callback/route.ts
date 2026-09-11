import { NextResponse } from "next/server";
import { consumeLoginToken, finishSupabaseLogin, setSessionCookie } from "@/server/auth";
import { supabaseAuthConfigured } from "@/server/supabase";

export const dynamic = "force-dynamic";

/** Where sign-in links land. Supabase Auth in production; the built-in dev fallback otherwise. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (supabaseAuthConfigured()) {
    const ok = await finishSupabaseLogin(url.searchParams);
    const next = url.searchParams.get("next") ?? "";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
    return to(ok ? safeNext : "/login?error=expired");
  }
  const token = url.searchParams.get("token") ?? "";
  const sid = token ? await consumeLoginToken(token) : null;
  if (!sid) return to("/login?error=expired");
  await setSessionCookie(sid);
  return to("/onboarding");
}
