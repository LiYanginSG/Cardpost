import Link from "next/link";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth";
import { supabaseAuthConfigured } from "@/server/supabase";
import { nextPostageDate } from "@/server/postage";
import { isAdmin } from "@/server/admin";
import { ProfileForm, SignOut, Toggle } from "@/app/account/client";
import { AvatarUpload } from "@/app/account/avatar-upload";
import { Avatar } from "@/components/avatar";
import { fmtDate, fmtDateYear } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <AppShell user={user} active="account">
      <Link href="/account" className="muted">← Account</Link>
      <h1 style={{ marginTop: 10 }}>Settings</h1>
      <p className="sub">The private side: how you sign in, what's printed on your cards, and what reaches you.</p>

      <h2>Picture</h2>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar name={user.displayName} url={user.avatarUrl} size={64} />
        <AvatarUpload hasAvatar={Boolean(user.avatarUrl)} />
      </div>

      <h2>Printed on your cards</h2>
      <ProfileForm displayName={user.displayName} city={user.city} />

      <h2>Sign-in</h2>
      <div className="kv"><span>Email</span><div className="v">{user.email}</div></div>
      {supabaseAuthConfigured() && <div className="kv"><span>Password</span><div className="v"><Link className="link" href="/account/password">Change password</Link></div></div>}
      <div className="kv"><span>Handle</span><div className="v">@{user.handle}</div></div>
      <div className="kv"><span>Member since</span><div className="v">{fmtDateYear(user.createdAt)}</div></div>
      <div className="kv"><span>Postage</span><div className="v">{user.postage} · next 12 on {fmtDate(nextPostageDate(user))}</div></div>

      <h2 id="preferences">Preferences</h2>
      <Toggle prefKey="openToWandering" value={user.openToWandering} label="Open to wandering mail" sub="Strangers' public cards can land with you, and you can post your own." />
      <Toggle prefKey="notifyOnArrival" value={user.notifyOnArrival} label="Email me when a card arrives" sub="The only message Cardpost ever sends. Nothing about cards in transit." />

      {isAdmin(user) && (
        <><h2>Admin</h2><p className="small" style={{ color: "var(--ink-2)" }}>Manage postcards, stamps and people.</p><div className="row-actions"><Link href="/admin" className="btn btn-sm">Open admin</Link></div></>
      )}

      <div style={{ marginTop: 28 }}><SignOut /></div>
    </AppShell>
  );
}
