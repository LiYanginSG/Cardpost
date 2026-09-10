"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { slugify } from "@/lib/catalogue";
import { requireAdmin } from "./admin";
import { uploadArtwork } from "./storage";
import type { FormState } from "./actions";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const ALLOWED = new Set(["image/svg+xml", "image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

async function readArt(fd: FormData, key: string): Promise<{ bytes: ArrayBuffer; type: string; ext: string } | string> {
  const f = fd.get(key);
  if (!(f instanceof File) || f.size === 0) return "Choose an artwork file.";
  if (!ALLOWED.has(f.type)) return "Artwork must be SVG, PNG, JPEG or WebP.";
  if (f.size > MAX_BYTES) return "Keep artwork under 4 MB.";
  const ext = { "image/svg+xml": "svg", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[f.type] ?? "bin";
  return { bytes: await f.arrayBuffer(), type: f.type, ext };
}

async function uniqueId(base: string, exists: (id: string) => Promise<boolean>) {
  let id = base, n = 2;
  while (await exists(id)) id = `${base}-${n++}`;
  return id;
}

function revalidateAll() {
  for (const p of ["/admin", "/store", "/write", "/account", "/mailbox", "/wall"]) revalidatePath(p);
}

export async function createDesignAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name").slice(0, 40);
  const artist = str(fd, "artist").slice(0, 40);
  const cost = Number(str(fd, "cost"));
  const orient = str(fd, "orient") === "port" ? "port" : "land";
  const note = str(fd, "note").slice(0, 160);
  if (!name || !artist) return { error: "Name and artist are required." };
  if (!Number.isInteger(cost) || cost < 0 || cost > 200) return { error: "Cost is postage, 0 to 200." };
  const art = await readArt(fd, "art");
  if (typeof art === "string") return { error: art };
  const id = await uniqueId(slugify(name), async (x) => Boolean(await db.design.findUnique({ where: { id: x } })));
  let artUrl: string;
  try { artUrl = await uploadArtwork(`postcards/${id}-${Date.now()}.${art.ext}`, art.bytes, art.type); } catch (e) { return { error: (e as Error).message }; }
  const last = await db.design.aggregate({ _max: { sortOrder: true } });
  await db.design.create({ data: { id, name, artist, cost, orient, note, featured: fd.get("featured") === "on", artUrl, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  revalidateAll();
  return { ok: `"${name}" is in the store.` };
}

export async function createStampAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name").slice(0, 40);
  const artist = str(fd, "artist").slice(0, 40);
  const cost = Number(str(fd, "cost"));
  const hue = Number(str(fd, "hue") || 206);
  const note = str(fd, "note").slice(0, 160);
  if (!name || !artist) return { error: "Name and artist are required." };
  if (!Number.isInteger(cost) || cost < 0 || cost > 200) return { error: "Cost is postage, 0 to 200." };
  if (!Number.isFinite(hue) || hue < 0 || hue > 360) return { error: "Hue is 0 to 360." };
  const art = await readArt(fd, "art");
  if (typeof art === "string") return { error: art };
  const id = await uniqueId(slugify(name), async (x) => Boolean(await db.stamp.findUnique({ where: { id: x } })));
  let artUrl: string;
  try { artUrl = await uploadArtwork(`stamps/${id}-${Date.now()}.${art.ext}`, art.bytes, art.type); } catch (e) { return { error: (e as Error).message }; }
  const last = await db.stamp.aggregate({ _max: { sortOrder: true } });
  await db.stamp.create({ data: { id, name, artist, cost, hue: Math.round(hue), note, featured: fd.get("featured") === "on", artUrl, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  revalidateAll();
  return { ok: `"${name}" is in the store.` };
}

export async function updateItemAction(kind: "design" | "stamp", id: string, patch: { active?: boolean; featured?: boolean; cost?: number }) {
  await requireAdmin();
  const data: { active?: boolean; featured?: boolean; cost?: number } = {};
  if (patch.active !== undefined) data.active = patch.active;
  if (patch.featured !== undefined) data.featured = patch.featured;
  if (patch.cost !== undefined && Number.isInteger(patch.cost) && patch.cost >= 0 && patch.cost <= 200) data.cost = patch.cost;
  if (kind === "design") await db.design.update({ where: { id }, data });
  else await db.stamp.update({ where: { id }, data });
  revalidateAll();
}

/** Every existing account receives a free design or stamp, e.g. a seasonal gift. */
export async function grantToEveryoneAction(kind: "design" | "stamp", id: string) {
  await requireAdmin();
  if (kind === "design") await db.$executeRaw`UPDATE "User" SET "ownedDesigns" = array_append("ownedDesigns", ${id}) WHERE NOT (${id} = ANY("ownedDesigns"))`;
  else await db.$executeRaw`UPDATE "User" SET "ownedStamps" = array_append("ownedStamps", ${id}) WHERE NOT (${id} = ANY("ownedStamps"))`;
  revalidateAll();
}
