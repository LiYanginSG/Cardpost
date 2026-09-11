"use client";
import { useState, useTransition } from "react";
import { buyDesignAction, buyStampAction, checkoutAction, type FormState } from "@/server/actions";

export function BuyButton({ kind, id, cost, canAfford }: { kind: "design" | "stamp" | "book"; id: string; cost: number | string; canAfford: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<FormState>(null);
  const run = () =>
    start(async () => {
      const r = kind === "design" ? await buyDesignAction(id) : kind === "stamp" ? await buyStampAction(id) : await checkoutAction(id);
      setMsg(r);
    });
  return (
    <div>
      <button type="button" className={`btn btn-sm ${kind === "book" ? "btn-primary" : ""}`} disabled={pending || (!canAfford && kind !== "book")} onClick={run}>
        {pending ? "…" : kind === "book" ? `Buy · ${cost}` : cost === 0 ? "Add · free" : `${cost} postage`}
      </button>
      {msg?.error && <div className="warn" style={{ margin: "6px 0 0" }}>{msg.error}</div>}
      {msg?.ok && <div className="ok" style={{ margin: "6px 0 0" }}>{msg.ok}</div>}
    </div>
  );
}
