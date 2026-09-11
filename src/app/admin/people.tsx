"use client";
import { useState, useTransition } from "react";
import { deletePersonAction } from "@/server/admin-actions";

export function DeletePersonButton({ userId, label }: { userId: string; label: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (msg === "Removed.") return <span className="muted">removed</span>;
  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => { if (confirm(`Delete ${label}? Their sign-in is removed from Supabase too. Cards they already delivered stay, shown as "Deleted account".`)) start(async () => { const r = await deletePersonAction(userId); setMsg(r?.ok ?? r?.error ?? null); }); }}>
        {pending ? "…" : "Delete"}
      </button>
      {msg && msg !== "Removed." && <span className="warn" style={{ margin: 0 }}>{msg}</span>}
    </>
  );
}
