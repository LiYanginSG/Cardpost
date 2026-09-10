import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendEmail, appUrl, emailConfigured } from "./email";
import { settleWeeklyPostage } from "./postage";
import { maintenanceTick } from "./maintenance";
import { now } from "@/lib/clock";
import type { User } from "@prisma/client";

export const SESSION_COOKIE = "cp_session";
const SESSION_DAYS = 90;
const TOKEN_MINUTES = 20;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Sign-in links may only be shown on screen outside production, or when DEV_LOGIN_LINKS=1 is set on purpose. */
const showLinksOnScreen = () => process.env.NODE_ENV !== "production" || process.env.DEV_LOGIN_LINKS === "1";

export async function startLogin(rawEmail: string): Promise<{ ok: true; devLink?: string } | { ok: false; error: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That doesn't look like an email address." };
  if (!emailConfigured() && !showLinksOnScreen()) {
    return { ok: false, error: "Sign-in email isn't set up yet. The site owner needs to add RESEND_API_KEY and EMAIL_FROM in Vercel." };
  }
  const token = randomBytes(32).toString("base64url");
  await db.loginToken.create({
    data: { email, tokenHash: sha(token), expiresAt: new Date(Date.now() + TOKEN_MINUTES * 60_000) },
  });
  const link = `${appUrl()}/auth/callback?token=${token}`;
  await sendEmail(
    email,
    "Your Cardpost sign-in link",
    `Tap to sign in to Cardpost:\n\n${link}\n\nThe link is good for ${TOKEN_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
    `<p style="font-family:Courier,monospace">Tap to sign in to Cardpost:</p><p><a href="${link}">${link}</a></p><p style="font-family:Courier,monospace;color:#5C6885">Good for ${TOKEN_MINUTES} minutes. If you didn't ask for it, ignore this email.</p>`,
  );
  return { ok: true, devLink: emailConfigured() || !showLinksOnScreen() ? undefined : link };
}

/** Consumes a magic-link token, creating the user if needed. Returns the session id or null. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const t = await db.loginToken.findUnique({ where: { tokenHash: sha(token) } });
  if (!t || t.usedAt || t.expiresAt < new Date()) return null;
  await db.loginToken.update({ where: { id: t.id }, data: { usedAt: new Date() } });
  const user = await db.user.upsert({ where: { email: t.email }, update: {}, create: { email: t.email } });
  const s = await db.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
  });
  return s.id;
}

export async function setSessionCookie(sessionId: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function clearSession() {
  const c = await cookies();
  const id = c.get(SESSION_COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id } });
  c.delete(SESSION_COOKIE);
}

/** Current user or null. Cached per request. Also settles any weekly postage that has come due. */
export const getUser = cache(async (): Promise<User | null> => {
  const c = await cookies();
  const id = c.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const s = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return settleWeeklyPostage(s.user, await now());
});

export const isOnboarded = (u: User) => Boolean(u.handle && u.displayName && u.city);

/** Requires a signed-in, onboarded user. Redirects otherwise. */
export async function requireUser(): Promise<User & { handle: string; displayName: string; city: string }> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (!isOnboarded(u)) redirect("/onboarding");
  maintenanceTick();
  return u as User & { handle: string; displayName: string; city: string };
}
