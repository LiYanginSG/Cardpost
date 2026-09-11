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

/* ---------- password and Google (Supabase Auth) ---------- */

type AuthOutcome = { ok: true; message?: string } | { ok: false; error: string };

const friendly = (msg: string) => {
  if (/invalid login credentials/i.test(msg)) return "Wrong email or password.";
  if (/rate limit/i.test(msg)) return "Too many attempts in a short time. Wait a few minutes and try again.";
  if (/already registered|already exists/i.test(msg)) return "There's already an account with that email. Sign in instead, or reset the password.";
  if (/password should be|weak password|at least/i.test(msg)) return "Use a longer password, at least 8 characters.";
  if (/email not confirmed/i.test(msg)) return "Confirm your email first. Check your inbox for the confirmation message.";
  if (/unsupported provider|provider is not enabled/i.test(msg)) return "That sign-in method isn't switched on in Supabase yet.";
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|timeout/i.test(msg)) return "Couldn't reach the sign-in service. Try again in a moment.";
  return msg;
};

export async function signInWithPassword(rawEmail: string, password: string): Promise<AuthOutcome> {
  const email = rawEmail.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, error: "That doesn't look like an email address." };
  if (!password) return { ok: false, error: "Enter your password." };
  const sb = await createServerSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

/** Creates an account. If Supabase requires email confirmation, the person gets a message instead of a session. */
export async function signUpWithPassword(rawEmail: string, password: string): Promise<AuthOutcome & { signedIn?: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, error: "That doesn't look like an email address." };
  if (password.length < 8) return { ok: false, error: "Use a password of at least 8 characters." };
  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${appUrl()}/auth/callback` } });
  if (error) return { ok: false, error: friendly(error.message) };
  if (data.session) return { ok: true, signedIn: true };
  // Supabase returns a user with no identities when the email already exists and confirmation is on.
  if (data.user && data.user.identities && data.user.identities.length === 0) return { ok: false, error: friendly("already registered") };
  return { ok: true, signedIn: false, message: "Account created. Check your inbox and click the confirmation link, then sign in." };
}

export async function sendPasswordReset(rawEmail: string): Promise<AuthOutcome> {
  const email = rawEmail.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, error: "That doesn't look like an email address." };
  const sb = await createServerSupabase();
  // Plain callback address: Supabase only forwards to addresses that exactly match the allow list.
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl()}/auth/callback` });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true, message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(password: string): Promise<AuthOutcome> {
  if (password.length < 8) return { ok: false, error: "Use a password of at least 8 characters." };
  const sb = await createServerSupabase();
  const { error } = await sb.auth.updateUser({ password });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true, message: "Password updated." };
}

export const googleSignInEnabled = () => process.env.GOOGLE_SIGNIN === "1";

/** Starts Google sign-in through Supabase. Returns the Google URL to send the browser to. */
export async function startGoogleSignIn(): Promise<{ url: string } | { error: string }> {
  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${appUrl()}/auth/callback` } });
  if (error || !data.url) return { error: friendly(error?.message ?? "Couldn't start Google sign-in.") };
  return { url: data.url };
}

export type CallbackResult = { ok: false } | { ok: true; recovery: boolean };

/**
 * Handles the link Supabase sends the person back on. Supports both the PKCE `code` and the `token_hash` template,
 * and reports whether the link was a password reset so the caller can send them to the set-password page.
 */
export async function finishSupabaseLogin(params: URLSearchParams): Promise<CallbackResult> {
  const sb = await createServerSupabase();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return { ok: false };
    return { ok: true, recovery: data.redirectType === "recovery" || type === "recovery" };
  }
  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "magiclink" | "recovery" | "signup" });
    if (error) return { ok: false };
    return { ok: true, recovery: type === "recovery" };
  }
  return { ok: false };
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
  const { data } = await sb.auth.getClaims();
  const claims = data?.claims;
  const authId = claims?.sub;
  const rawEmail = typeof claims?.email === "string" ? claims.email : undefined;
  if (!authId || !rawEmail) return null;
  const email = rawEmail.toLowerCase();
  const byAuth = await db.user.findUnique({ where: { authId } });
  if (byAuth) return byAuth;
  // First sign-in: create the profile row, or link an existing row with the same email.
  return db.user.upsert({ where: { email }, update: { authId }, create: { email, authId } });
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
