/* Procedural SVG artwork. Everything scales without asset variants. */

import type { Design, Stamp } from "@/lib/catalogue";

const P = {
  ink: "#1B2A4A",
  red: "#D0342C",
  blue: "#1F4E9C",
  paper: "#FCFBF7",
  kraft: "#E5D7B8",
};

/**
 * Postcard front artwork. Uploaded designs render their image; built-ins are drawn procedurally.
 * Landscape designs draw in a 300x200 box, portrait in 200x300.
 */
export function DesignArt({ design, className }: { design: Design; className?: string }) {
  if (design.artUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={design.artUrl} alt="" className={className} draggable={false} />;
  }
  const port = design.orient === "port";
  const vb = port ? "0 0 200 300" : "0 0 300 200";
  return (
    <svg viewBox={vb} className={className} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {scene(design.id)}
    </svg>
  );
}

function scene(id: string) {
  switch (id) {
    case "monsoon":
      return (
        <g>
          <defs>
            <linearGradient id="mn-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7C8AA0" />
              <stop offset="1" stopColor="#C4CBD3" />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill="url(#mn-sky)" />
          <path d="M0 150 C60 120 90 140 150 118 S250 110 300 130 V200 H0Z" fill="#3E7A5E" />
          <path d="M0 168 C50 150 120 172 180 150 S260 145 300 160 V200 H0Z" fill="#2C5D48" />
          <path d="M0 186 C80 178 160 192 300 180 V200 H0Z" fill="#1F4438" />
          <g stroke="#F2F5F7" strokeWidth="1" opacity=".55">
            {Array.from({ length: 34 }).map((_, i) => (
              <line key={i} x1={i * 9 + 8} y1={(i * 37) % 60} x2={i * 9 - 4} y2={(i * 37) % 60 + 48} />
            ))}
          </g>
          <circle cx="238" cy="50" r="16" fill="#E8E2D2" opacity=".7" />
        </g>
      );
    case "ember":
      return (
        <g>
          <defs>
            <linearGradient id="em-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3A2A55" />
              <stop offset=".55" stopColor="#B84D3F" />
              <stop offset="1" stopColor="#F0A15A" />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill="url(#em-sky)" />
          <circle cx="210" cy="118" r="22" fill="#FFD27A" opacity=".9" />
          {[
            [0, 130, 40, 70], [38, 118, 34, 82], [70, 140, 50, 60], [118, 108, 26, 92], [142, 126, 44, 74],
            [184, 134, 30, 66], [212, 116, 40, 84], [250, 128, 50, 72],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} fill="#241B2E" />
              <rect x={x + 6} y={y + 10} width="5" height="7" fill="#FFB25A" opacity={i % 3 === 0 ? 1 : 0.35} />
              <rect x={x + w - 12} y={y + 22} width="5" height="7" fill="#FFB25A" opacity={i % 2 === 0 ? 1 : 0.3} />
            </g>
          ))}
          <path d="M0 200 H300" stroke="#120C18" strokeWidth="6" />
        </g>
      );
    case "polar":
      return (
        <g>
          <defs>
            <linearGradient id="po-au" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4DE3A5" stopOpacity=".0" />
              <stop offset=".4" stopColor="#4DE3A5" stopOpacity=".7" />
              <stop offset="1" stopColor="#9B7BE8" stopOpacity=".1" />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill="#0E1A3A" />
          {Array.from({ length: 40 }).map((_, i) => (
            <circle key={i} cx={(i * 73) % 300} cy={(i * 41) % 120} r={i % 5 === 0 ? 1.4 : 0.8} fill="#FFF" opacity=".8" />
          ))}
          <path d="M-10 90 C60 20 120 110 190 40 S280 60 310 20 V110 C240 150 170 90 110 140 S40 120 -10 150Z" fill="url(#po-au)" />
          <path d="M-10 70 C70 40 110 90 200 30 S270 50 310 30" stroke="#9BF0CF" strokeWidth="2" fill="none" opacity=".5" />
          <path d="M0 150 L60 140 L110 158 L170 138 L230 152 L300 136 V200 H0Z" fill="#DCE9F5" />
          <path d="M0 170 L80 164 L150 178 L220 166 L300 172 V200 H0Z" fill="#B9CFE4" />
        </g>
      );
    case "archipelago":
      return (
        <g>
          <rect width="300" height="200" fill="#2E8FA3" />
          <rect width="300" height="200" fill="#1B6F84" opacity=".35" />
          {[
            "M40 60 c20 -18 50 -10 62 6 s-6 30 -30 32 s-50 -12 -32 -38z",
            "M150 120 c14 -22 46 -20 66 -4 s8 34 -18 40 s-62 -6 -48 -36z",
            "M215 40 c18 -10 40 2 44 18 s-16 26 -34 20 s-26 -28 -10 -38z",
            "M70 150 c10 -14 32 -14 42 -2 s-2 24 -18 24 s-34 -8 -24 -22z",
            "M240 150 c8 -8 24 -6 28 4 s-6 16 -16 14 s-20 -10 -12 -18z",
          ].map((d, i) => (
            <g key={i}>
              <path d={d} fill="#CFE6E2" transform="translate(3 4)" opacity=".5" />
              <path d={d} fill="#5FA06B" />
              <path d={d} fill="#3E7D53" transform="translate(-3 -3) scale(.9)" opacity=".6" />
            </g>
          ))}
          <g stroke="#FFF" strokeWidth="1" opacity=".35" fill="none">
            <path d="M0 30 q20 -6 40 0 t40 0 t40 0" />
            <path d="M180 180 q20 -6 40 0 t40 0 t40 0" />
          </g>
        </g>
      );
    case "nightpost":
      return (
        <g>
          <rect width="300" height="200" fill="#142346" />
          <rect x="0" y="130" width="300" height="70" fill="#0C162E" />
          <rect x="30" y="40" width="240" height="90" fill="#1D2F5C" stroke="#3A4F86" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x={44 + i * 38} y="54" width="26" height="30" fill={i === 2 || i === 4 ? "#F6D486" : "#22376A"} opacity={i === 2 || i === 4 ? 0.95 : 1} />
          ))}
          <path d="M150 10 v30" stroke="#F6D486" strokeWidth="1" />
          <ellipse cx="150" cy="44" rx="18" ry="6" fill="#F6D486" />
          <ellipse cx="150" cy="110" rx="70" ry="22" fill="#F6D486" opacity=".08" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={60 + i * 48} y="96" width="34" height="30" fill="#C9A15C" opacity=".85" />
          ))}
          <text x="150" y="160" textAnchor="middle" fill="#8A9BC9" fontSize="10" fontFamily="'Courier Prime', monospace" letterSpacing="3">SORTING · 02:00</text>
        </g>
      );
    case "lantern":
      return (
        <g>
          <defs>
            <radialGradient id="la-glow" cx=".5" cy=".5" r=".5">
              <stop offset="0" stopColor="#FFD98A" stopOpacity=".95" />
              <stop offset="1" stopColor="#FFD98A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="300" fill="#3A2A1F" />
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M0 ${300 - i * 30} L110 ${300 - i * 30 - 18} V${300 - i * 30 + 6} L0 ${300 - i * 30 + 24}Z`} fill={i % 2 ? "#5A4331" : "#4A3628"} />
          ))}
          <rect x="120" y="0" width="80" height="300" fill="#2A1E17" />
          <circle cx="140" cy="118" r="70" fill="url(#la-glow)" />
          <rect x="132" y="98" width="16" height="30" rx="3" fill="#F6C561" />
          <rect x="135" y="92" width="10" height="6" fill="#241A14" />
          <path d="M140 92 v-40" stroke="#241A14" strokeWidth="2" />
        </g>
      );
    default: // classic airmail
      return (
        <g>
          <rect width="300" height="200" fill={P.paper} />
          <rect x="10" y="10" width="280" height="180" fill="none" stroke={P.ink} strokeWidth="1" />
          <path d="M20 150 C90 60 180 140 270 50" stroke={P.blue} strokeWidth="1.2" strokeDasharray="4 4" fill="none" />
          <g transform="translate(262 48) rotate(-30)">
            <path d="M0 0 l-12 5 l-3 -3 l6 -2 l-9 -6 l3 -1 l12 4 l6 -2z" fill={P.red} />
          </g>
          <circle cx="24" cy="148" r="2.5" fill={P.red} />
          <text x="150" y="176" textAnchor="middle" fill={P.ink} fontSize="11" fontFamily="'Courier Prime', monospace" letterSpacing="4">PAR AVION</text>
          <g>
            {Array.from({ length: 14 }).map((_, i) => (
              <rect key={i} x={20 + i * 20} y="18" width="10" height="4" fill={i % 2 ? P.red : P.blue} transform={`skewX(-30)`} />
            ))}
          </g>
        </g>
      );
  }
}

/** A stamp: perforated rectangle, tinted by hue, with a small motif. 42x53 box. */
export function StampArt({ stamp, className, cancelled }: { stamp: Stamp; className?: string; cancelled?: boolean }) {
  const { id, hue } = stamp;
  const bg = `hsl(${hue} 42% 88%)`;
  const fg = `hsl(${hue} 55% 34%)`;
  return (
    <svg viewBox="0 0 42 53" className={className} aria-hidden="true">
      <rect x="1" y="1" width="40" height="51" fill="#FFF" />
      <rect x="1" y="1" width="40" height="51" fill="none" stroke="#FFF" strokeWidth="2" strokeDasharray="2 2" />
      <rect x="4" y="4" width="34" height="45" fill={bg} stroke={fg} strokeWidth=".8" />
      {stamp.artUrl ? <image href={stamp.artUrl} x="4.5" y="4.5" width="33" height="36" preserveAspectRatio="xMidYMid slice" /> : stampMotif(id, fg)}
      <text x="21" y="46" textAnchor="middle" fontSize="4.5" fill={fg} fontFamily="'Courier Prime', monospace" letterSpacing=".5">CARDPOST</text>
      {cancelled && (
        <g stroke="#1B2A4A" strokeWidth=".9" opacity=".7" fill="none">
          <path d="M-2 18 q6 -3 12 0 t12 0 t12 0 t12 0" />
          <path d="M-2 24 q6 -3 12 0 t12 0 t12 0 t12 0" />
          <path d="M-2 30 q6 -3 12 0 t12 0 t12 0 t12 0" />
        </g>
      )}
    </svg>
  );
}

function stampMotif(id: string, fg: string) {
  switch (id) {
    case "crane":
      return <path d="M10 30 c6 -10 12 -12 20 -14 l-4 4 c4 2 6 6 4 10 c-6 -2 -12 -1 -20 0z M28 15 l4 -3" stroke={fg} strokeWidth="1" fill="none" />;
    case "orchid":
      return (
        <g fill={fg}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="21" cy="17" rx="3.5" ry="7" transform={`rotate(${r} 21 24)`} opacity=".85" />
          ))}
          <circle cx="21" cy="24" r="2.2" fill="#FFF" />
        </g>
      );
    case "beacon":
      return (
        <g>
          <path d="M17 36 l2 -20 h4 l2 20z" fill={fg} />
          <rect x="16" y="12" width="10" height="5" fill={fg} />
          <path d="M26 14 l10 -5 M26 15 l10 0 M26 16 l10 5" stroke={fg} strokeWidth=".8" opacity=".7" />
          <path d="M8 38 q6 -3 12 0 t12 0" stroke={fg} strokeWidth=".8" fill="none" />
        </g>
      );
    case "koi":
      return (
        <g fill={fg}>
          <path d="M10 26 c6 -10 18 -10 22 -2 c-4 8 -16 8 -22 2z" />
          <path d="M31 24 l6 -5 v10z" />
          <circle cx="15" cy="24" r="1" fill="#FFF" />
        </g>
      );
    case "comet":
      return (
        <g>
          <circle cx="28" cy="16" r="3.5" fill={fg} />
          <path d="M26 18 L8 36 M28 20 L14 38 M25 15 L6 30" stroke={fg} strokeWidth="1" opacity=".7" />
        </g>
      );
    default:
      return (
        <g transform="translate(21 24) rotate(-25)">
          <path d="M0 0 l-9 4 l-2 -2 l4 -2 l-7 -4 l2 -1 l9 3 l5 -2z" fill={fg} />
        </g>
      );
  }
}

/** Circular postmark: origin city on the top arc, date in the middle, rotated a few degrees. */
export function Postmark({ city, date, className }: { city: string; date: string; className?: string }) {
  const c = city.toUpperCase();
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden="true">
      <g transform="rotate(-8 30 30)" fill="none" stroke="#1B2A4A" opacity=".82">
        <circle cx="30" cy="30" r="27" strokeWidth="1.3" />
        <circle cx="30" cy="30" r="19" strokeWidth=".7" />
        <defs>
          <path id="pm-arc" d="M8 30 a22 22 0 0 1 44 0" />
        </defs>
        <text fontSize="6" fill="#1B2A4A" stroke="none" fontFamily="'Courier Prime', monospace" letterSpacing="1">
          <textPath href="#pm-arc" startOffset="50%" textAnchor="middle">{c}</textPath>
        </text>
        <text x="30" y="32" textAnchor="middle" fontSize="6.5" fill="#1B2A4A" stroke="none" fontFamily="'Courier Prime', monospace" fontWeight="700">{date}</text>
        <text x="30" y="44" textAnchor="middle" fontSize="4.5" fill="#1B2A4A" stroke="none" fontFamily="'Courier Prime', monospace" letterSpacing="1.5">CARDPOST</text>
      </g>
    </svg>
  );
}

/** Wax seal, red. */
export function WaxSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="wax" cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#E0524A" />
          <stop offset="1" stopColor="#9E1F1A" />
        </radialGradient>
      </defs>
      <path d="M40 4 c10 -2 20 4 26 10 s12 16 10 26 s-6 22 -14 28 s-20 8 -30 6 s-20 -10 -24 -20 s-4 -22 2 -30 s18 -18 30 -20z" fill="url(#wax)" />
      <circle cx="40" cy="40" r="24" fill="none" stroke="#7A1512" strokeWidth="1.2" opacity=".7" />
      <text x="40" y="46" textAnchor="middle" fontSize="18" fill="#FBE3DF" fontFamily="'Courier Prime', monospace" fontWeight="700" opacity=".9">C</text>
    </svg>
  );
}
