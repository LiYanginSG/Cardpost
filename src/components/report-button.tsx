"use client";
import { useState, useTransition } from "react";
import { reportHopAction } from "@/server/actions";

export function ReportButton({ hopId, cardId }: { hopId: string; cardId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  if (done) return <span className="muted">{done}</span>;
  return (
    <button type="button" className="link muted" disabled={pending} onClick={() => { if (confirm("Report this line? It will be removed from the card.")) start(async () => { const r = await reportHopAction(hopId, cardId); setDone(r?.ok ?? r?.error ?? null); }); }}>
      {pending ? "…" : "report"}
    </button>
  );
}
