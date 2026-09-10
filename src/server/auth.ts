import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendEmail, appUrl } from "./email";
import { settleWeeklyPostage } from "./postage";
import { maintenanceTick } from "./maintenance";
import { createServerSupabase, supabaseAuthConfigured } from "./supabase";
import { now } from "@/lib/clock";
import type { User } from "@prisma/client";

/*
 * Sign-in is Supabase Auth (email magic link). Supabase sends the email and owns the session cookies;
 * this app keeps a profile row per person in the User table, linked by authId.
 *
 * When Supabase isn't configured and we're not in production (local development, tests), a small
 * built-in magic-link fallback is used so the app can run with nothing but a database.
 */

export type LoginResult = { ok: true; devLink?: string } | { ok: false; error: string };

/** The built-in fallback is for development only. DEV_LOGIN_LINKS=1 enables it under `next start` locally; never set it on Vercel. */
const fallbackAllowed = () => process.env.NODE_ENV !== "production" || process.env.DEV_LOGIN_LINKS === "1";

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function startLogin(rawEmail: string): Promise<LoginResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, error: "That doesn't look like an email address." };
  if (supabaseAuthConfigured()) return startSupabaseLogin(email);
  if (!fallbackAllowed()) return { ok: false, error: "Sign-in isn't configured. The site owner needs to connect Supabase." };
  return startFallbackLogin(email);
}

async function startSupabaseLogin(email: string): Promise<LoginResult> {
  const sb = await createServerSupabase();
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${appUrl()}/auth/callback`, shouldCreateUser: true } });
  if (error) {
    if (/rate limit/i.test(error.message)) return { ok: false, error: "Too many sign-in emails in a short time. Wait a few minutes and try again." };
    console.error("signInWithOtp", error);
    return { ok: false, error: "Couldn't send the sign-in email. Try again in a moment." };
  }
  return { ok: true };
}

/** Handles the link Supabase sends the person back on. Supports both the PKCE `code` and the `token_hash` template. */
export async function finishSupabaseLogin(params: URLSearchParams): Promise<boolean> {
  const sb = await createServerSupabase();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    return !error;
  }
  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "magiclink" });
    return !error;
  }
  return false;
}

/* ---------- built-in fallback (development only) ---------- */

export const SESSION_COOKIE = "cp_session";
const SESSION_DAYS = 90;
const TOKEN_MINUTES = 20;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function startFallbackLogin(email: string): Promise<LoginResult> {
  const token = randomBytes(32).toString("base64url");
  await db.loginToken.create({ data: { email, tokenHash: sha(token), expiresAt: new Date(Date.now() + TOKEN_MINUTES * 60_000) } });
  const link = `${appUrl()}/auth/callback?token=${token}`;
  await sendEmail(email, "Your Cardpost sign-in link", `Tap to sign in to Cardpost:\n\n${link}\n\nGood for ${TOKEN_MINUTES} minutes.`);
  return { ok: true, devLink: link };
}

export async function consumeLoginToken(token: string): Promise<string | null> {
  const t = await db.loginToken.findUnique({ where: { tokenHash: sha(token) } });
  if (!t || t.usedAt || t.expiresAt < new Date()) return null;
  await db.loginToken.update({ where: { id: t.id }, data: { usedAt: new Date() } });
  const user = await db.user.upsert({ where: { email: t.email }, update: {}, create: { email: t.email } });
  const s = await db.session.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) } });
  return s.id;
}

export async function setSessionCookie(sessionId: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86_400 });
}

/* ---------- current user ---------- */

async function fallbackUser(): Promise<User | null> {
  const c = await cookies();
  const id = c.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const s = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return s.user;
}

async function supabaseUser(): Promise<User | null> {
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  const au = data.user;
  if (!au?.email) return null;
  const email = au.email.toLowerCase();
  const byAuth = await db.user.findUnique({ where: { authId: au.id } });
  if (byAuth) return byAuth;
  // First sign-in: create the profile row, or link an existing row with the same email.
  return db.user.upsert({ where: { email }, update: { authId: au.id }, create: { email, authId: au.id } });
}

/** Current user or null. Cached per request. Also settles any weekly postage that has come due. */
export const getUser = cache(async (): Promise<User | null> => {
  const u = supabaseAuthConfigured() ? await supabaseUser() : await fallbackUser();
  if (!u) return null;
  return settleWeeklyPostage(u, await now());
});

export async function clearSession() {
  if (supabaseAuthConfigured()) {
    const sb = await createServerSupabase();
    await sb.auth.signOut();
    return;
  }
  const c = await cookies();
  const id = c.get(SESSION_COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id } });
  c.delete(SESSION_COOKIE);
}

export const isOnboarded = (u: User) => Boolean(u.handle && u.displayName && u.city);

/** Requires a signed-in, onboarded user. Redirects otherwise. */
export async function requireUser(): Promise<User & { handle: string; displayName: string; city: string }> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (!isOnboarded(u)) redirect("/onboarding");
  maintenanceTick();
  return u as User & { handle: string; displayName: string; city: string };
}
