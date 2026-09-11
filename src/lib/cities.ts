import { CITY_ROWS } from "./cities-data";

export type City = { name: string; cc: string; lat: number; lon: number; population: number };

/** Every city with 100,000+ people. Names are unique keys; where two cities share a name, the smaller is "Name, CC". */
export const CITIES: City[] = CITY_ROWS.map(([name, cc, lat, lon, population]) => ({ name, cc, lat, lon, population }));

const byName = new Map(CITIES.map((c) => [c.name, c]));
const byNameCc = new Map(CITIES.map((c) => [`${c.name.split(", ")[0]}, ${c.cc}`.toLowerCase(), c]));

/** Names the app used before the big list, or common English spellings, mapped to dataset keys. */
const ALIASES: Record<string, string> = { "New York": "New York City", "Montreal": "Montréal", "Bombay": "Mumbai", "Saigon": "Ho Chi Minh City", "Peking": "Beijing" };

/** Resolves a stored city string: the exact key, an alias, or "Name, CC" in either form. */
export function cityByName(name: string | null | undefined): City | undefined {
  if (!name) return undefined;
  return byName.get(name) ?? byName.get(ALIASES[name] ?? "") ?? byNameCc.get(name.toLowerCase());
}
export function isCity(name: string): boolean {
  return Boolean(cityByName(name));
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const folded = CITIES.map((c) => ({ c, f: fold(c.name) }));

/** Typeahead: prefix matches first, then anywhere in the name, biggest cities first. */
export function searchCities(q: string, limit = 12): City[] {
  const needle = fold(q.trim());
  if (!needle) return [];
  const starts: City[] = [], contains: City[] = [];
  for (const { c, f } of folded) {
    if (f.startsWith(needle)) starts.push(c);
    else if (f.includes(needle)) contains.push(c);
  }
  const byPop = (a: City, b: City) => b.population - a.population;
  return [...starts.sort(byPop), ...contains.sort(byPop)].slice(0, limit);
}
