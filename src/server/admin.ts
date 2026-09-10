import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { requireUser } from "./auth";

/** Admins are listed in ADMIN_EMAILS (comma-separated). They can manage the postcard and stamp catalogue. */
export function isAdmin(user: Pick<User, "email">): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(user.email.toLowerCase());
}

export async function requireAdmin() {
  const u = await requireUser();
  if (!isAdmin(u)) redirect("/account");
  return u;
}
