"use client";
import { useState } from "react";

/** A postcard you can turn over. Front and back are rendered by the server; this only flips. */
export function FlipCard({ front, back, orient, startFlipped = false, hint = true, wrapClass = "" }: { front: React.ReactNode; back: React.ReactNode; orient: string; startFlipped?: boolean; hint?: boolean; wrapClass?: string }) {
  const [flipped, setFlipped] = useState(startFlipped);
  return (
    <div className={`card-wrap ${wrapClass}`}>
      <div className={`card3d ${orient === "port" ? "port" : ""} ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)} role="button" tabIndex={0} aria-label="Turn the card over" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((f) => !f); } }}>
        <div className="face front">{front}</div>
        <div className="face back">{back}</div>
      </div>
      {hint && <div className="flip-hint">tap to turn over</div>}
    </div>
  );
}
