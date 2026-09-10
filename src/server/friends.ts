import "server-only";
import { db } from "@/lib/db";

export async function areFriends(a: string, b: string): Promise<boolean> {
  const n = await db.friendship.count({
    where: { status: "accepted", OR: [{ userId: a, friendId: b }, { userId: b, friendId: a }] },
  });
  return n > 0;
}

export type FriendRow = { id: string; handle: string; displayName: string; city: string; since: Date };

/** Accepted friends, either direction. */
export async function listFriends(userId: string): Promise<FriendRow[]> {
  const rows = await db.friendship.findMany({
    where: { status: "accepted", OR: [{ userId }, { friendId: userId }] },
    include: { user: true, friend: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => {
    const o = r.userId === userId ? r.friend : r.user;
    return { id: o.id, handle: o.handle ?? "", displayName: o.displayName ?? o.email, city: o.city ?? "", since: r.createdAt };
  });
}

export async function pendingRequests(userId: string) {
  const incoming = await db.friendship.findMany({ where: { friendId: userId, status: "pending" }, include: { user: true } });
  const outgoing = await db.friendship.findMany({ where: { userId, status: "pending" }, include: { friend: true } });
  return {
    incoming: incoming.map((r) => ({ id: r.id, userId: r.user.id, handle: r.user.handle ?? "", displayName: r.user.displayName ?? "", city: r.user.city ?? "" })),
    outgoing: outgoing.map((r) => ({ id: r.id, userId: r.friend.id, handle: r.friend.handle ?? "", displayName: r.friend.displayName ?? "", city: r.friend.city ?? "" })),
  };
}

export async function relationship(a: string, b: string): Promise<"self" | "friends" | "sent" | "received" | "none"> {
  if (a === b) return "self";
  const rows = await db.friendship.findMany({ where: { OR: [{ userId: a, friendId: b }, { userId: b, friendId: a }] } });
  if (rows.some((r) => r.status === "accepted")) return "friends";
  if (rows.some((r) => r.userId === a)) return "sent";
  if (rows.some((r) => r.userId === b)) return "received";
  return "none";
}

export async function requestFriend(userId: string, handle: string): Promise<{ ok: boolean; error?: string }> {
  const h = handle.trim().replace(/^@/, "").toLowerCase();
  const other = await db.user.findUnique({ where: { handle: h } });
  if (!other) return { ok: false, error: `No one goes by @${h}.` };
  if (other.id === userId) return { ok: false, error: "That's you." };
  const existing = await db.friendship.findFirst({ where: { OR: [{ userId, friendId: other.id }, { userId: other.id, friendId: userId }] } });
  if (existing?.status === "accepted") return { ok: false, error: "Already in your address book." };
  if (existing?.userId === userId) return { ok: false, error: "Request already sent." };
  if (existing) {
    await db.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
    return { ok: true };
  }
  await db.friendship.create({ data: { userId, friendId: other.id } });
  return { ok: true };
}

export async function acceptFriend(userId: string, friendshipId: string) {
  await db.friendship.updateMany({ where: { id: friendshipId, friendId: userId, status: "pending" }, data: { status: "accepted" } });
}

export async function removeFriend(userId: string, otherId: string) {
  await db.friendship.deleteMany({ where: { OR: [{ userId, friendId: otherId }, { userId: otherId, friendId: userId }] } });
}
