import { DesignArt, Postmark, StampArt } from "./art";
import type { Design, Stamp } from "@/lib/catalogue";
import { fmtDate, handSize } from "@/lib/format";
import { fmtKm } from "@/lib/geo";

/** Front face: artwork only, plus a small route caption. */
export function PostcardFront({ design, fromCity, toCity, km }: { design: Design; fromCity: string; toCity?: string | null; km?: number }) {
  return (
    <div className="front-art">
      <DesignArt design={design} />
      <div className="front-cap">
        {fromCity}{toCity ? ` → ${toCity}` : ""}{km ? ` · ${fmtKm(km)}` : ""}
      </div>
    </div>
  );
}

/** Back face: message in a handwriting face, address block with stamp cancelled by the postmark. */
export function PostcardBack({ design: d, stamp: s, body, signature, toName, toCity, postmarkCity, postmarkDate }: {
  design: Design; stamp: Stamp; body: string; signature: string; toName: string; toCity: string; postmarkCity: string; postmarkDate: Date | string;
}) {
  return (
    <div className={`back-grid ${d.orient === "port" ? "port" : ""}`}>
      <div className="msg">
        <p style={{ fontSize: handSize(body) }}>{body}</p>
        <div className="sig">— {signature}</div>
      </div>
      <div className="divider" />
      <div className="addr">
        <StampArt stamp={s} className="stamp" cancelled />
        <Postmark city={postmarkCity} date={fmtDate(postmarkDate)} className="postmark" />
        <div className="lines"><i /><i /><i /></div>
        <div className="to">TO<b>{toName}</b>{toCity}</div>
      </div>
    </div>
  );
}

/** Fixed-size thumbnail; artwork fits inside, letterboxed if needed. Never stretched. */
export function DesignThumb({ design, square }: { design: Design; square?: boolean }) {
  return (
    <div className={`thumb ${square ? "sq" : ""}`}>
      <DesignArt design={design} />
    </div>
  );
}
