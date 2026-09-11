"use client";
import { useState, useTransition } from "react";
import { recallCardAction } from "@/server/actions";

/** Sender-only: destroys a card that hasn't landed and refunds the postage. */
export function RecallButton({ cardId, refund }: { cardId: string; refund: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => { if (confirm(`Recall this card? It will be destroyed and ${refund} postage returned to you.`)) start(async () => { const r = await recallCardAction(cardId); if (r?.error) setError(r.error); }); }}>
        {pending ? "Recalling…" : "Recall"}
      </button>
      {error && <span className="warn" style={{ margin: 0 }}>{error}</span>}
    </>
  );
}
