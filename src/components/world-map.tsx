import { cityByName } from "@/lib/cities";

// Coarse land mask on a 72x28 grid (row, colStart, colEnd). Enough to read a route; nobody navigates by it.
const LAND: [number, number, number][] = [[0,12,28],[0,31,35],[0,48,68],[1,10,29],[1,31,35],[1,44,69],[2,8,30],[2,31,35],[2,36,40],[2,40,70],
[3,6,30],[3,31,34],[3,36,40],[3,40,70],[4,5,30],[4,33,33],[4,36,40],[4,40,70],[5,8,30],[5,34,35],[5,36,41],[5,41,70],
[6,9,30],[6,34,34],[6,35,42],[6,42,70],[7,10,30],[7,34,44],[7,44,66],[8,12,30],[8,34,42],[8,42,66],
[9,13,30],[9,34,42],[9,42,64],[10,14,29],[10,34,44],[10,44,62],[11,15,27],[11,34,44],[11,44,48],[11,50,62],
[12,16,26],[12,34,46],[12,50,62],[13,17,25],[13,33,46],[13,50,60],[14,19,24],[14,32,46],[14,51,60],
[15,21,25],[15,32,46],[15,56,60],[16,22,28],[16,33,44],[16,56,62],[17,22,30],[17,33,44],[17,56,62],
[18,22,31],[18,34,44],[18,57,63],[19,22,31],[19,34,42],[20,23,31],[20,34,42],[20,58,64],
[21,24,31],[21,34,42],[21,57,65],[22,24,30],[22,34,41],[22,57,65],[23,25,29],[23,35,40],[23,58,64],[23,69,70],
[24,25,28],[24,69,70],[25,25,28],[26,25,28],[27,26,27]];
const W = 72, H = 28, LAT_TOP = 85, LAT_BOT = -55;
const CELL = 10;
const px = (lon: number) => ((lon + 180) / 360) * W * CELL;
const py = (lat: number) => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOT)) * H * CELL;

function pt(city: string) {
  const c = cityByName(city);
  return c ? { x: px(c.lon), y: py(c.lat) } : null;
}
function arc(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const lift = Math.min(90, len * 0.22);
  const cx = mx - (dy / len) * lift, cy = my + (dx / len) * lift;
  return { d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`, cx, cy };
}
function onArc(a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/**
 * Route map. `cities` in order; every leg is drawn. If `progress` is given (0..1), the last leg is the one in
 * flight and a red marker sits at that fraction along it.
 */
export function WorldMap({ cities, progress }: { cities: string[]; progress?: number }) {
  const pts = cities.map((c) => ({ name: c, p: pt(c) })).filter((x): x is { name: string; p: { x: number; y: number } } => Boolean(x.p));
  const legs = pts.slice(1).map((b, i) => ({ a: pts[i].p, b: b.p, ...arc(pts[i].p, b.p) }));
  const last = legs[legs.length - 1];
  const inFlight = progress !== undefined && last;
  const marker = inFlight ? onArc(last.a, { x: last.cx, y: last.cy }, last.b, Math.max(0, Math.min(1, progress))) : null;
  return (
    <div className="map">
      <svg viewBox={`0 0 ${W * CELL} ${H * CELL}`} role="img" aria-label={`Route: ${cities.join(" to ")}`}>
        <rect width={W * CELL} height={H * CELL} fill="#EDF1F7" />
        <g fill="#B8C4D6">
          {LAND.flatMap(([r, s, e]) => Array.from({ length: e - s + 1 }, (_, i) => (
            <circle key={`${r}-${s + i}`} cx={(s + i) * CELL + CELL / 2} cy={r * CELL + CELL / 2} r={3.2} />
          )))}
        </g>
        {legs.map((l, i) => (
          <path key={i} d={l.d} fill="none" stroke={inFlight && i === legs.length - 1 ? "#D0342C" : "#1F4E9C"} strokeWidth={2.2} strokeDasharray={inFlight && i === legs.length - 1 ? "6 5" : undefined} opacity={0.9} />
        ))}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.p.x} cy={p.p.y} r={i === 0 || i === pts.length - 1 ? 6 : 4.5} fill="#FCFBF7" stroke="#1B2A4A" strokeWidth={2} />
            <text x={p.p.x + 9} y={p.p.y - 8} fontSize="13" fontFamily="var(--mono)" fill="#1B2A4A" fontWeight={700}>{p.name}</text>
          </g>
        ))}
        {marker && (
          <g>
            <circle cx={marker.x} cy={marker.y} r={11} fill="#D0342C" opacity={0.25} />
            <circle cx={marker.x} cy={marker.y} r={6} fill="#D0342C" stroke="#FCFBF7" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  );
}
