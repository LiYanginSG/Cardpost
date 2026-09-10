"use client";
import { useActionState, useTransition, useState } from "react";
import { passOnAction, returnToPoolAction, type FormState } from "@/server/actions";
import { MAX_BODY } from "@/lib/format";

/** Holder of a wandering card: add a line and pass it on (1 postage), or return it to the pool. */
export function WanderingActions({ cardId, postage }: { cardId: string; postage: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(passOnAction, null);
  const [returning, startReturn] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [len, setLen] = useState(0);
  return (
    <form action={action} style={{ marginTop: 8 }}>
      <input type="hidden" name="cardId" value={cardId} />
      <div className="field">
        <label htmlFor="note">Add a line before you pass it on</label>
        <textarea id="note" name="note" maxLength={MAX_BODY} placeholder="One true thing from where you are." onChange={(e) => setLen(e.target.value.length)} />
        <div className="count">{len}/{MAX_BODY}</div>
      </div>
      {(state?.error || err) && <div className="warn">{state?.error ?? err}</div>}
      <div className="row-actions">
        <button className="btn btn-primary" disabled={pending || returning || postage < 1}>{pending ? "Sending on…" : "Sign and pass on · 1 postage"}</button>
        <button type="button" className="btn btn-ghost" disabled={pending || returning} onClick={() => startReturn(async () => { const r = await returnToPoolAction(cardId); if (r?.error) setErr(r.error); })}>{returning ? "Returning…" : "Return to the pool"}</button>
      </div>
      <p className="hint">Your line and your city go on the card's history for everyone who holds it next. Returning it costs nothing and leaves no trace.</p>
    </form>
  );
}
