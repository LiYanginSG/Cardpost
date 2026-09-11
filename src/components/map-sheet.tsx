"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "./icons";

/**
 * A bottom sheet (centred dialog on desktop). The trigger renders inline, but the overlay goes into a portal on
 * document.body: an ancestor with a transform or animation would otherwise become the containing block for
 * `position: fixed`, and the sheet would be trapped inside a list row.
 */
export function Sheet({ label, title, children, className }: { label: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);

  const overlay = (
    <div className="sheet-bg" onClick={() => setOpen(false)}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="hd"><h3>{title}</h3><button type="button" onClick={() => setOpen(false)} aria-label="Close"><IconClose /></button></div>
        {children}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" className={className ?? "btn btn-sm btn-ghost"} onClick={() => setOpen(true)}>{label}</button>
      {open && mounted && createPortal(overlay, document.body)}
    </>
  );
}
