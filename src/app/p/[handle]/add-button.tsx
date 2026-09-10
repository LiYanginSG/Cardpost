"use client";
import { useState, useTransition } from "react";
import { addFriendAction, type FormState } from "@/server/actions";

export function ProfileAddButton({ handle }: { handle: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>(null);
  if (state?.ok) return <span className="chip">Request sent</span>;
  return (
    <>
      <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(async () => { const fd = new FormData(); fd.set("handle", handle); setState(await addFriendAction(null, fd)); })}>{pending ? "…" : "Add to address book"}</button>
      {state?.error && <span className="warn" style={{ margin: 0 }}>{state.error}</span>}
    </>
  );
}
