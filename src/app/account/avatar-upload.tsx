"use client";
import { useRef, useState, useTransition } from "react";
import { uploadAvatarAction } from "@/server/actions";

/** Picks a picture, squares and shrinks it in the browser (256px JPEG), then uploads. */
export function AvatarUpload({ hasAvatar }: { hasAvatar: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setMsg(null);
    const blob = await squareJpeg(file, 256).catch(() => null);
    if (!blob) { setMsg("Couldn't read that image. Try a JPG or PNG."); return; }
    const fd = new FormData();
    fd.set("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    start(async () => { const r = await uploadAvatarAction(fd); setMsg(r?.error ?? r?.ok ?? null); });
  };

  return (
    <div className="row-actions" style={{ alignItems: "center" }}>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <button type="button" className="btn btn-sm" disabled={pending} onClick={() => input.current?.click()}>{pending ? "Uploading…" : hasAvatar ? "Change picture" : "Add a picture"}</button>
      {hasAvatar && !pending && <button type="button" className="btn btn-sm btn-ghost" onClick={() => start(async () => { const fd = new FormData(); fd.set("remove", "1"); const r = await uploadAvatarAction(fd); setMsg(r?.error ?? r?.ok ?? null); })}>Remove</button>}
      {msg && <span className="muted">{msg}</span>}
    </div>
  );
}

async function squareJpeg(file: File, size: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.86));
  } finally {
    URL.revokeObjectURL(url);
  }
}
