import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { appUrl } from "./email";
import type { User } from "@prisma/client";

export const INVITE_COOKIE = "cp_invite";
export const INVITE_BONUS = Math.max(0, Number(process.env.INVITE_BONUS ?? 5) || 0);
export const INVITE_REWARD_CAP = Math.max(0, Number(process.env.INVITE_REWARD_CAP ?? 20) || 0); // rewarded sign-ups per inviter

const newCode = () => randomBytes(5).toString("base64url").replace(/[-_]/g, "x").slice(0, 7).toLowerCase();

/** Every account gets a short invite code the first time it's needed. */
export async function ensureInviteCode(user: User): Promise<string> {
  if (user.inviteCode) return user.inviteCode;
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    try {
      await db.user.update({ where: { id: user.id }, data: { inviteCode: code } });
      return code;
    } catch {
      /* collision, try again */
    }
  }
  throw new Error("Couldn't create an invite code.");
}

export const inviteUrl = (code: string) => `${appUrl()}/i/${code}`;

export async function inviterByCode(code: string) {
  if (!/^[a-z0-9]{4,12}$/.test(code)) return null;
  return db.user.findFirst({ where: { inviteCode: code, deletedAt: null, handle: { not: null } }, select: { id: true, displayName: true, handle: true, city: true, avatarUrl: true, inviteCode: true } });
}

export async function rememberInvite(code: string) {
  const c = await cookies();
  c.set(INVITE_COOKIE, code, { path: "/", sameSite: "lax", maxAge: 30 * 86_400, httpOnly: true, secure: process.env.NODE_ENV === "production" });
}

export async function pendingInviteCode(): Promise<string | null> {
  const c = await cookies();
  return c.get(INVITE_COOKIE)?.value ?? null;
}

/**
 * Links a newcomer to the person who invited them: address-book entry both ways, and postage for both.
 * Safe to call more than once; a person can only be invited once.
 */
export async function applyInvite(newUserId: string, code: string): Promise<{ inviterName: string } | null> {
  const inviter = await inviterByCode(code);
  const me = await db.user.findUnique({ where: { id: newUserId } });
  if (!inviter || !me || inviter.id === me.id || me.invitedById) return null;
  const reward = INVITE_BONUS > 0;
  const inviterFull = await db.user.findUnique({ where: { id: inviter.id }, select: { invitesRewarded: true } });
  const rewardInviter = reward && (inviterFull?.invitesRewarded ?? 0) < INVITE_REWARD_CAP;
  await db.$transaction([
    db.user.update({ where: { id: me.id }, data: { invitedById: inviter.id, postage: { increment: reward ? INVITE_BONUS : 0 } } }),
    db.user.update({ where: { id: inviter.id }, data: { invitesRewarded: { increment: rewardInviter ? 1 : 0 }, postage: { increment: rewardInviter ? INVITE_BONUS : 0 } } }),
    db.friendship.upsert({
      where: { userId_friendId: { userId: inviter.id, friendId: me.id } },
      update: { status: "accepted" },
      create: { userId: inviter.id, friendId: me.id, status: "accepted" },
    }),
  ]);
  const c = await cookies();
  c.delete(INVITE_COOKIE);
  return { inviterName: inviter.displayName ?? "a friend" };
}

export async function inviteStats(userId: string) {
  const joined = await db.user.count({ where: { invitedById: userId, deletedAt: null } });
  const u = await db.user.findUnique({ where: { id: userId }, select: { invitesRewarded: true } });
  return { joined, earned: (u?.invitesRewarded ?? 0) * INVITE_BONUS };
}
