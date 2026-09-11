import Link from "next/link";
import { inviterByCode, pendingInviteCode, INVITE_BONUS } from "@/server/invites";
import { Avatar } from "@/components/avatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "You're invited" };

export default async function InviteLanding({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  const code = await pendingInviteCode();
  const inviter = code && !expired ? await inviterByCode(code) : null;
  if (!inviter) {
    return (
      <div className="auth"><div className="stripe" /><div className="top"><div className="mark" /><h1>That invite has expired.</h1><p>Ask your friend for a fresh link, or <Link className="link" href="/login">sign in</Link>.</p></div></div>
    );
  }
  const first = inviter.displayName?.split(" ")[0] ?? "They";
  return (
    <div className="auth">
      <div className="stripe" />
      <div className="top">
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
          <Avatar name={inviter.displayName ?? ""} url={inviter.avatarUrl} size={64} />
          <div><div className="muted">@{inviter.handle} · {inviter.city}</div><h1>{inviter.displayName} wants to send you slow mail.</h1></div>
        </div>
        <p>Cardpost is a postcard app where cards take real days to arrive, and you can't see one until it lands. Join and {first} goes straight into your address book{INVITE_BONUS ? `, with ${INVITE_BONUS} postage on the house for each of you` : ""}.</p>
        <div className="row-actions" style={{ marginTop: 22 }}>
          <Link href="/login?mode=create" className="btn btn-primary btn-block">Join Cardpost</Link>
        </div>
        <p className="hint">Already have an account? <Link className="link" href="/login">Sign in</Link> and you'll be linked the same way.</p>
      </div>
    </div>
  );
}
