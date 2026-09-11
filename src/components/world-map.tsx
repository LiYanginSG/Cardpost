import { cityByName } from "@/lib/cities";
import { LAND_PATH, LAT_BOT, LAT_TOP, MAP_H, MAP_W } from "./world-land";

const px = (lon: number) => ((lon + 180) / 360) * MAP_W;
const py = (lat: number) => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOT)) * MAP_H;

/** Rendered once per page (in the app shell). Every map on the page reuses it with <use>. */
export function LandDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <path id="cp-land" d={LAND_PATH} />
      </defs>
    </svg>
  );
}

type Pt = { x: number; y: number };
type Leg = { a: Pt; b: Pt; c: Pt; d: string };

function point(city: string): (Pt & { name: string; lon: number }) | null {
  const c = cityByName(city);
  return c ? { name: c.name, x: px(c.lon), y: py(c.lat), lon: c.lon } : null;
}

/** Quadratic arc between two points, bowing toward the nearer pole so long hops read as flight paths. */
function arc(a: Pt, b: Pt): Leg {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const lift = Math.min(110, len * 0.28);
  const up = my > MAP_H / 2 ? 1 : -1; // bow away from the equator-ish middle for a natural curve
  const cx = mx - (dy / len) * lift * up, cy = my + (dx / len) * lift * up;
  return { a, b, c: { x: cx, y: cy }, d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}` };
}
function onArc(l: Leg, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * l.a.x + 2 * u * t * l.c.x + t * t * l.b.x, y: u * u * l.a.y + 2 * u * t * l.c.y + t * t * l.b.y };
}
function tangentAngle(l: Leg, t: number): number {
  const dx = 2 * (1 - t) * (l.c.x - l.a.x) + 2 * t * (l.b.x - l.c.x);
  const dy = 2 * (1 - t) * (l.c.y - l.a.y) + 2 * t * (l.b.y - l.c.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Route map in the airmail style. `cities` in order; every leg is drawn. With `progress` (0..1) the last leg is the
 * one in flight: dashed red, with the plane at that fraction along it. Legs that cross the date line wrap around.
 */
export function WorldMap({ cities, progress }: { cities: string[]; progress?: number }) {
  const pts = cities.map(point).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const legs: Leg[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = { ...pts[i] };
    const dlon = pts[i].lon - a.lon;
    if (dlon > 180) b.x -= MAP_W;
    if (dlon < -180) b.x += MAP_W;
    legs.push(arc(a, b));
  }
  const inFlight = progress !== undefined && legs.length > 0;
  const last = legs[legs.length - 1];
  const t = Math.max(0, Math.min(1, progress ?? 1));
  const plane = inFlight ? onArc(last, t) : null;
  const planeAngle = inFlight ? tangentAngle(last, t) : 0;
  const wrapX = (x: number) => ((x % MAP_W) + MAP_W) % MAP_W;
  const uid = cities.join("|").replace(/[^a-z0-9]/gi, "").slice(0, 24) || "map";

  return (
    <div className="map">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`Route: ${cities.join(" to ")}`}>
        <defs>
          <clipPath id={`clip-${uid}`}><rect width={MAP_W} height={MAP_H} /></clipPath>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="#F4F2EA" />
        <g stroke="#DDD9CE" strokeWidth="0.8">
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => <line key={lon} x1={px(lon)} y1={0} x2={px(lon)} y2={MAP_H} />)}
          {[60, 30, 0, -30].map((lat) => <line key={lat} x1={0} y1={py(lat)} x2={MAP_W} y2={py(lat)} />)}
        </g>
        <use href="#cp-land" fill="#E7E0CC" stroke="#B9A47B" strokeWidth="0.9" strokeLinejoin="round" />
        <g clipPath={`url(#clip-${uid})`} fill="none" strokeLinecap="round">
          {legs.map((l, i) => {
            const flying = inFlight && i === legs.length - 1;
            return [0, -MAP_W, MAP_W].map((off) => (
              <g key={`${i}-${off}`} transform={`translate(${off} 0)`}>
                <path d={l.d} stroke="#FCFBF7" strokeWidth="5" opacity="0.9" />
                <path d={l.d} stroke={flying ? "#D0342C" : "#1F4E9C"} strokeWidth="2.2" strokeDasharray={flying ? "7 6" : undefined} />
              </g>
            ));
          })}
        </g>
        {pts.map((p, i) => {
          const end = i === 0 || i === pts.length - 1;
          const left = p.x > MAP_W - 130;
          return (
            <g key={`${p.name}-${i}`}>
              <circle cx={p.x} cy={p.y} r={end ? 6.5 : 4.5} fill="#FCFBF7" stroke="#1B2A4A" strokeWidth="2" />
              {end && <circle cx={p.x} cy={p.y} r={2.2} fill={i === 0 ? "#1F4E9C" : "#D0342C"} />}
              <text x={left ? p.x - 11 : p.x + 11} y={p.y - 9} fontSize="14" fontFamily="var(--mono)" fontWeight="700" fill="#1B2A4A" textAnchor={left ? "end" : "start"} stroke="#F4F2EA" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">{p.name.toUpperCase()}</text>
            </g>
          );
        })}
        {plane && (
          <g transform={`translate(${wrapX(plane.x)} ${plane.y}) rotate(${planeAngle})`}>
            <circle r="13" fill="#D0342C" opacity="0.18" />
            <path d="M-9 0 L-3 -2 L4 -2 L9 0 L4 2 L-3 2 Z M-3 -2 L-6 -7 L-4 -7 L0 -2 M-3 2 L-6 7 L-4 7 L0 2 M4 -2 L6 -4 M4 2 L6 4" fill="#D0342C" stroke="#D0342C" strokeWidth="1.2" strokeLinejoin="round" />
          </g>
        )}
        <text x="12" y="20" fontSize="11" fontFamily="var(--mono)" letterSpacing="3" fill="#8A93A8">AIR MAIL</text>
        <text x={MAP_W - 12} y={MAP_H - 10} fontSize="9" fontFamily="var(--mono)" fill="#B9A47B" textAnchor="end">{inFlight ? `${Math.round(t * 100)}% of the way` : `${Math.max(0, pts.length - 1)} leg${pts.length === 2 ? "" : "s"}`}</text>
      </svg>
    </div>
  );
}
