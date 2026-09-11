"use client";
import { useState } from "react";

export function InviteBox({ url, bonus }: { url: string; bonus: number }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const text = `Send me a postcard on Cardpost. It takes real days to arrive. ${url}`;
  return (
    <div>
      <div className="field"><label htmlFor="invite-url">Your invite link</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="invite-url" readOnly value={url} onFocus={(e) => e.target.select()} style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} }}>{copied ? "Copied" : "Copy"}</button>
          {canShare && <button type="button" className="btn btn-primary" onClick={() => navigator.share({ title: "Cardpost", text, url }).catch(() => {})}>Share</button>}
        </div>
      </div>
      <p className="hint">Anyone who joins through it lands in your address book straight away{bonus ? `, and you both get ${bonus} postage` : ""}.</p>
    </div>
  );
}
