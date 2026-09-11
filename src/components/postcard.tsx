import { DesignArt, Postmark, StampArt } from "./art";
import type { Design, Stamp } from "@/lib/catalogue";
import { fmtDate, handSize } from "@/lib/format";
import { fmtKm } from "@/lib/geo";

/** Front face: artwork only. The route is printed on the back. */
export function PostcardFront({ design }: { design: Design; fromCity?: string; toCity?: string | null; km?: number }) {
  return (
    <div className="front-art">
      <DesignArt design={design} />
    </div>
  );
}

/** Back face: message in a handwriting face, address block with stamp cancelled by the postmark. */
export function PostcardBack({ design: d, stamp: s, body, signature, toName, toCity, postmarkCity, postmarkDate, fromCity, km }: {
  design: Design; stamp: Stamp; body: string; signature: string; toName: string; toCity: string; postmarkCity: string; postmarkDate: Date | string; fromCity?: string; km?: number;
}) {
  return (
    <div className={`back-grid ${d.orient === "port" ? "port" : ""}`}>
      <div className="msg">
        <p style={{ fontSize: `${handSize(body)}cqw` }}>{body}</p>
        <div className="sig">— {signature}</div>
      </div>
      <div className="divider" />
      <div className="addr">
        <div className="imprint">
          <b>POST CARD</b>
          {(fromCity ?? postmarkCity).toUpperCase()}
          {toCity ? <><br />{"\u2192 "}{toCity.toUpperCase()}</> : null}
          {km ? <><br />{fmtKm(km)}</> : null}
        </div>
        <StampArt stamp={s} className="stamp" cancelled />
        <Postmark city={postmarkCity} date={fmtDate(postmarkDate)} className="postmark" />
        <div className="lines"><i /><i /><i /></div>
        <div className="to">TO<b>{toName}</b><span>{toCity}</span></div>
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
