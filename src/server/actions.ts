"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { isCity } from "@/lib/cities";
import { clearSession, getUser, requireUser, startLogin, signInWithPassword, signUpWithPassword, sendPasswordReset, updatePassword, startGoogleSignIn } from "./auth";
import { openCard, passOn, recallCard, reportHop, returnToPool, sendSealed, sendWandering } from "./cards";
import { acceptFriend, removeFriend, requestFriend } from "./friends";
import { buyDesign, buyStamp, createCheckout, setActive, stripeConfigured } from "./store";
import { sendWelcomeCard } from "./welcome";
import { uploadArtwork } from "./storage";
import { applyInvite, pendingInviteCode } from "./invites";

export type FormState = { error?: string; ok?: string; devLink?: string } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/* ---------- auth ---------- */

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await startLogin(str(fd, "email"));
  if (!r.ok) return { error: r.error };
  return { ok: "sent", devLink: r.devLink };
}

export async function passwordSignInAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await signInWithPassword(str(fd, "email"), String(fd.get("password") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect("/");
}

export async function passwordSignUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await signUpWithPassword(str(fd, "email"), String(fd.get("password") ?? ""));
  if (!r.ok) return { error: r.error };
  if (r.signedIn) redirect("/onboarding");
  return { ok: r.message };
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await sendPasswordReset(str(fd, "email"));
  return r.ok ? { ok: r.message } : { error: r.error };
}

export async function setPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  await getUser().then((u) => { if (!u) redirect("/login"); });
  const pw = String(fd.get("password") ?? "");
  if (pw !== String(fd.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  const r = await updatePassword(pw);
  return r.ok ? { ok: r.message } : { error: r.error };
}

export async function googleSignInAction(): Promise<FormState> {
  const r = await startGoogleSignIn();
  if ("error" in r) return { error: r.error };
  redirect(r.url);
}

export async function signOutAction() {
  await clearSession();
  redirect("/login");
}

export async function onboardAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await getUser();
  if (!u) redirect("/login");
  const handle = str(fd, "handle").replace(/^@/, "").toLowerCase();
  const displayName = str(fd, "displayName").slice(0, 40);
  const city = str(fd, "city");
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) return { error: "Handles are 3 to 20 letters, numbers or underscores." };
  if (!displayName) return { error: "Tell us the name to print on your cards." };
  if (!isCity(city)) return { error: "Pick a city from the list. Any city with 100,000 people or more is in there." };
  const taken = await db.user.findFirst({ where: { handle, NOT: { id: u.id } } });
  if (taken) return { error: `@${handle} is taken.` };
  const firstTime = !u.city;
  await db.user.update({ where: { id: u.id }, data: { handle, displayName, city } });
  if (firstTime) {
    const t = await now();
    const code = await pendingInviteCode();
    if (code) await applyInvite(u.id, code).catch((e) => console.error("invite", e));
    await sendWelcomeCard(u.id, t);
  }
  redirect("/mailbox");
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const displayName = str(fd, "displayName").slice(0, 40);
  const city = str(fd, "city");
  if (!displayName) return { error: "Display name can't be empty." };
  if (!isCity(city)) return { error: "Pick a city from the list. Any city with 100,000 people or more is in there." };
  await db.user.update({ where: { id: u.id }, data: { displayName, city } });
  revalidatePath("/account");
  return { ok: "Saved." };
}

export async function uploadAvatarAction(fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (fd.get("remove") === "1") {
    await db.user.update({ where: { id: u.id }, data: { avatarUrl: null } });
    revalidatePath("/account");
    return { ok: "Picture removed." };
  }
  const f = fd.get("avatar");
  if (!(f instanceof File) || f.size === 0) return { error: "Choose a picture." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return { error: "Use a JPG, PNG or WebP." };
  if (f.size > 2 * 1024 * 1024) return { error: "Keep it under 2 MB." };
  const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
  let url: string;
  try { url = await uploadArtwork(`avatars/${u.id}-${Date.now()}.${ext}`, await f.arrayBuffer(), f.type); } catch (e) { return { error: (e as Error).message }; }
  await db.user.update({ where: { id: u.id }, data: { avatarUrl: url } });
  revalidatePath("/account");
  revalidatePath("/p", "layout");
  return { ok: "Picture updated." };
}

export async function setPrefAction(key: "openToWandering" | "notifyOnArrival", value: boolean) {
  const u = await requireUser();
  await db.user.update({ where: { id: u.id }, data: { [key]: value } });
  revalidatePath("/account");
}

/* ---------- cards ---------- */

export async function sendCardAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const kind = str(fd, "kind") === "wandering" ? "wandering" : "sealed";
  const designId = str(fd, "designId") || u.activeDesign;
  const stampId = str(fd, "stampId") || u.activeStamp;
  const t = await now();
  const r =
    kind === "sealed"
      ? await sendSealed(u, { recipientId: str(fd, "recipientId"), designId, stampId, title: str(fd, "title"), body: str(fd, "body") }, t)
      : await sendWandering(u, { designId, stampId, title: str(fd, "title"), body: str(fd, "body") }, t);
  if (!r.ok) return { error: r.error };
  await setActive(u.id, designId, stampId);
  revalidatePath("/mailbox");
  redirect(`/mailbox?kind=${kind}&box=out&sent=${r.value.id}`);
}

export async function openCardAction(cardId: string): Promise<FormState> {
  const u = await requireUser();
  const r = await openCard(cardId, u.id, await now());
  revalidatePath(`/card/${cardId}`);
  revalidatePath("/mailbox");
  return r.ok ? { ok: "opened" } : { error: r.error };
}

export async function recallCardAction(cardId: string): Promise<FormState> {
  const u = await requireUser();
  const r = await recallCard(cardId, u.id, await now());
  if (!r.ok) return { error: r.error };
  revalidatePath("/mailbox");
  redirect("/mailbox?kind=sealed&box=out&recalled=1");
}

export async function passOnAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const cardId = str(fd, "cardId");
  const r = await passOn(cardId, u, str(fd, "note"), await now());
  if (!r.ok) return { error: r.error };
  revalidatePath("/mailbox");
  redirect(`/mailbox?kind=wandering&box=out`);
}

export async function returnToPoolAction(cardId: string): Promise<FormState> {
  const u = await requireUser();
  const r = await returnToPool(cardId, u.id, await now());
  if (!r.ok) return { error: r.error };
  revalidatePath("/mailbox");
  redirect(`/mailbox?kind=wandering&box=in`);
}

export async function reportHopAction(hopId: string, cardId: string): Promise<FormState> {
  const u = await requireUser();
  const r = await reportHop(hopId, u.id);
  revalidatePath(`/card/${cardId}`);
  return r.ok ? { ok: "Reported. The line has been removed and the card keeps moving." } : { error: r.error };
}

/* ---------- friends ---------- */

export async function addFriendAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const r = await requestFriend(u.id, str(fd, "handle"));
  revalidatePath("/account");
  revalidatePath("/p", "layout");
  return r.ok ? { ok: "Request sent." } : { error: r.error };
}

export async function acceptFriendAction(friendshipId: string) {
  const u = await requireUser();
  await acceptFriend(u.id, friendshipId);
  revalidatePath("/account");
}

export async function removeFriendAction(otherId: string) {
  const u = await requireUser();
  await removeFriend(u.id, otherId);
  revalidatePath("/account");
  revalidatePath("/p", "layout");
}

/* ---------- store ---------- */

export async function buyDesignAction(designId: string): Promise<FormState> {
  const u = await requireUser();
  const r = await buyDesign(u.id, designId);
  revalidatePath("/store");
  revalidatePath("/account");
  return r.ok ? { ok: "Added to your collection." } : { error: r.error };
}

export async function buyStampAction(stampId: string): Promise<FormState> {
  const u = await requireUser();
  const r = await buyStamp(u.id, stampId);
  revalidatePath("/store");
  revalidatePath("/account");
  return r.ok ? { ok: "Added to your collection." } : { error: r.error };
}

export async function setActiveAction(designId?: string, stampId?: string) {
  const u = await requireUser();
  await setActive(u.id, designId, stampId);
}

export async function checkoutAction(bookId: string): Promise<FormState> {
  const u = await requireUser();
  if (!stripeConfigured()) {
    if (process.env.NODE_ENV !== "production" || process.env.DEV_TIME_TRAVEL === "1") {
      // Dev convenience: no Stripe configured, so credit the book directly.
      const postage = { book10: 10, book30: 30, book100: 100 }[bookId] ?? 0;
      await db.user.update({ where: { id: u.id }, data: { postage: { increment: postage } } });
      revalidatePath("/store");
      return { ok: `Dev mode: ${postage} postage added.` };
    }
    return { error: "Postage books aren't on sale yet." };
  }
  let url: string | null = null;
  try {
    url = await createCheckout(u.id, u.email, bookId);
  } catch (e) {
    console.error("stripe checkout", e);
    return { error: "Couldn't reach the payment service. Try again in a moment." };
  }
  if (!url) return { error: "Couldn't start checkout." };
  redirect(url);
}
