import "server-only";
import { db } from "@/lib/db";
import { supabaseUrl } from "./supabase";

const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const adminHeaders = () => ({ apikey: serviceKey(), authorization: `Bearer ${serviceKey()}` });

/**
 * Removes a person from the app. Their profile is anonymised rather than dropped, so cards they already
 * delivered keep rendering ("Deleted account"). Undelivered sealed cards they sent are destroyed, friendships
 * removed, and they leave the wandering pool. Their Supabase Auth user is deleted too when the service key is set.
 */
export async function deletePerson(userId: string, now: Date): Promise<void> {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u || u.deletedAt) return;
  if (u.authId && supabaseUrl() && serviceKey()) {
    const r = await fetch(`${supabaseUrl()}/auth/v1/admin/users/${u.authId}`, { method: "DELETE", headers: adminHeaders() });
    if (!r.ok && r.status !== 404) throw new Error(`Supabase refused to delete the sign-in user (${r.status}).`);
  }
  await anonymise(u.id, now);
}

async function anonymise(userId: string, now: Date) {
  await db.$transaction([
    db.session.deleteMany({ where: { userId } }),
    db.friendship.deleteMany({ where: { OR: [{ userId }, { friendId: userId }] } }),
    // Nobody has seen these yet: unarrived sealed cards they sent, and sealed cards addressed to them.
    db.card.deleteMany({ where: { type: "sealed", OR: [{ senderId: userId }, { recipientId: userId }], arrivesAt: { gt: now } } }),
    db.user.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        email: `deleted-${userId}@deleted.invalid`,
        authId: null,
        handle: null,
        displayName: "Deleted account",
        openToWandering: false,
        notifyOnArrival: false,
        phoneVerified: false,
        avatarUrl: null,
      },
    }),
  ]);
  // Wandering cards in their hands go back to the pool.
  const held = await db.card.findMany({ where: { type: "wandering", recipientId: userId, status: { in: ["in_transit", "delivered"] } }, select: { id: true } });
  const { assignNextHolder } = await import("./cards");
  for (const c of held) await assignNextHolder(c.id, now);
}

/**
 * People deleted directly in Supabase's Authentication page: their sign-in user is gone but the profile remains.
 * Checks a batch of profiles against Supabase and anonymises those whose auth user no longer exists (explicit 404 only).
 */
export async function sweepDeletedAuthUsers(now: Date, limit = 25): Promise<number> {
  if (!supabaseUrl() || !serviceKey()) return 0;
  const users = await db.user.findMany({ where: { authId: { not: null }, deletedAt: null }, select: { id: true, authId: true }, take: limit, orderBy: { createdAt: "asc" } });
  let removed = 0;
  for (const u of users) {
    try {
      const r = await fetch(`${supabaseUrl()}/auth/v1/admin/users/${u.authId}`, { headers: adminHeaders() });
      if (r.status === 404) {
        await anonymise(u.id, now);
        removed++;
      }
    } catch (e) {
      console.error("auth sweep", e);
    }
  }
  return removed;
}

export async function listPeople() {
  return db.user.findMany({
    where: { deletedAt: null, isDemo: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, handle: true, displayName: true, city: true, createdAt: true, postage: true, avatarUrl: true, _count: { select: { sentCards: true } } },
    take: 500,
  });
}
