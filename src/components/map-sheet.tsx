"use client";
import { useEffect, useState } from "react";
import { IconClose } from "./icons";

/** A bottom sheet (centered dialog on desktop). Trigger is rendered inline; content is server-rendered and passed in. */
export function Sheet({ label, title, children, className }: { label: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" className={className ?? "btn btn-sm btn-ghost"} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div className="sheet-bg" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
            <div className="hd"><h3>{title}</h3><button type="button" onClick={() => setOpen(false)} aria-label="Close"><IconClose /></button></div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
