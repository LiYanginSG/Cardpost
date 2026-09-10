"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openCardAction } from "@/server/actions";
import { WaxSeal } from "./art";

/**
 * The emotional peak of the app. An unopened sealed card shows only a wax seal.
 * Breaking it records openedAt on the server, then the card turns over to reveal the message.
 */
export function SealReveal({ cardId, front, back, opened, orient }: { cardId: string; front: React.ReactNode; back: React.ReactNode | null; opened: boolean; orient: "land" | "port" }) {
  const router = useRouter();
  const [breaking, setBreaking] = useState(false);
  const [flipped, setFlipped] = useState(opened);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened && breaking) {
      const t = setTimeout(() => { setFlipped(true); setBreaking(false); }, 80);
      return () => clearTimeout(t);
    }
  }, [opened, breaking]);

  const breakSeal = () => {
    if (breaking || pending) return;
    setBreaking(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) { try { navigator.vibrate?.([12, 40, 24]); } catch {} }
    start(async () => {
      const r = await openCardAction(cardId);
      if (r?.error) { setError(r.error); setBreaking(false); return; }
      router.refresh();
    });
  };

  if (!opened) {
    return (
      <div className="card-wrap">
        <div className={`card3d ${orient === "port" ? "port" : ""}`} style={{ cursor: "default" }}>
          <div className="face sealed-face">
            <button className={`seal-btn ${breaking ? "breaking" : ""}`} onClick={breakSeal} disabled={pending} aria-label="Break the seal">
              <WaxSeal />
              <span>{breaking ? "breaking…" : "break the seal"}</span>
            </button>
          </div>
        </div>
        {error && <div className="warn">{error}</div>}
      </div>
    );
  }

  return (
    <div className="card-wrap fade-in">
      <div className={`card3d ${orient === "port" ? "port" : ""} ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)} role="button" tabIndex={0} aria-label="Turn the card over" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((f) => !f); } }}>
        <div className="face front">{front}</div>
        <div className="face back">{back}</div>
      </div>
      <div className="flip-hint">tap to turn over</div>
    </div>
  );
}
