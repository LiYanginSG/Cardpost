import { NextResponse } from "next/server";
import { consumeLoginToken, setSessionCookie } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const sid = token ? await consumeLoginToken(token) : null;
  if (!sid) return NextResponse.redirect(new URL("/login?error=expired", url.origin));
  await setSessionCookie(sid);
  return NextResponse.redirect(new URL("/onboarding", url.origin));
}
