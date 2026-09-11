import { NextResponse } from "next/server";
import { getUser, isOnboarded } from "@/server/auth";
import { applyInvite, inviterByCode, rememberInvite } from "@/server/invites";

export const dynamic = "force-dynamic";

/** Invite link. Remembers the code in a cookie, then shows the landing page; signed-in people are linked at once. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const url = new URL(req.url);
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const { code } = await params;
  const inviter = await inviterByCode(code.toLowerCase());
  if (!inviter) return to("/invite?expired=1");
  const me = await getUser();
  if (me && isOnboarded(me)) {
    if (me.id !== inviter.id) await applyInvite(me.id, inviter.inviteCode ?? code).catch((e) => console.error("invite", e));
    return to(`/p/${inviter.handle}`);
  }
  await rememberInvite(inviter.inviteCode ?? code);
  return to(me ? "/onboarding" : "/invite");
}
