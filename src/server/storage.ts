import "server-only";

const url = () => (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const bucket = () => process.env.SUPABASE_ARTWORK_BUCKET || "artwork";

export const storageConfigured = () => Boolean(url() && key());

const headers = () => ({ apikey: key(), authorization: `Bearer ${key()}` });

async function ensureBucket() {
  const r = await fetch(`${url()}/storage/v1/bucket/${bucket()}`, { headers: headers() });
  if (r.ok) return;
  const c = await fetch(`${url()}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ id: bucket(), name: bucket(), public: true, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: ["image/svg+xml", "image/png", "image/jpeg", "image/webp"] }),
  });
  if (!c.ok) throw new Error(`Couldn't create the "${bucket()}" bucket: ${await c.text()}`);
}

/**
 * Uploads artwork to Supabase Storage (public bucket) and returns its public URL.
 * Without Supabase configured, the file is inlined as a data URL so local dev still works.
 */
export async function uploadArtwork(path: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  if (!storageConfigured()) {
    return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  }
  await ensureBucket();
  const r = await fetch(`${url()}/storage/v1/object/${bucket()}/${path}`, {
    method: "POST",
    headers: { ...headers(), "content-type": contentType, "x-upsert": "true", "cache-control": "public, max-age=31536000, immutable" },
    body: bytes,
  });
  if (!r.ok) throw new Error(`Upload failed: ${await r.text()}`);
  return `${url()}/storage/v1/object/public/${bucket()}/${path}`;
}
