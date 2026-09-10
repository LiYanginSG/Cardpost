"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DevClock({ offsetDays, nowLabel }: { offsetDays: number; nowLabel: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (d: number) =>
    start(async () => {
      await fetch("/api/dev/clock", { method: "POST", body: JSON.stringify({ days: d }), headers: { "content-type": "application/json" } });
      router.refresh();
    });
  return (
    <div className="clock" role="status">
      <span>dev clock</span>
      <b>{nowLabel}</b>
      {offsetDays !== 0 && <span>(+{offsetDays}d)</span>}
      <span className="spacer" />
      <button disabled={pending} onClick={() => set(offsetDays + 1)}>+1 day</button>
      <button disabled={pending} onClick={() => set(offsetDays + 7)}>+7 days</button>
      <button disabled={pending} onClick={() => set(0)}>reset</button>
    </div>
  );
}
