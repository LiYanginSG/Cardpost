import { NextResponse } from "next/server";
import { consumeLoginToken, finishSupabaseLogin, setSessionCookie } from "@/server/auth";
import { supabaseAuthConfigured } from "@/server/supabase";

export const dynamic = "force-dynamic";

/** Where sign-in links land. Supabase Auth in production; the built-in dev fallback otherwise. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (supabaseAuthConfigured()) {
    const r = await finishSupabaseLogin(url.searchParams);
    if (!r.ok) return to("/login?error=expired");
    if (r.recovery) return to("/account/password");
    const next = url.searchParams.get("next") ?? "";
    return to(next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding");
  }
  const token = url.searchParams.get("token") ?? "";
  const sid = token ? await consumeLoginToken(token) : null;
  if (!sid) return to("/login?error=expired");
  await setSessionCookie(sid);
  return to("/onboarding");
}
