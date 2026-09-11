import { CITY_ROWS } from "./cities-data";
import { countryName } from "./countries";

export type City = { name: string; cc: string; lat: number; lon: number; population: number };

/** Every city with 20,000+ people. Names are unique keys; where two share a name, the smaller is "Name, Region". */
export const CITIES: City[] = CITY_ROWS.map(([name, cc, lat, lon, population]) => ({ name, cc, lat, lon, population }));

const byName = new Map(CITIES.map((c) => [c.name, c]));
const byNameCc = new Map(CITIES.map((c) => [`${c.name.split(",")[0]}, ${c.cc}`.toLowerCase(), c]));

/** Names the app used before the big list, or common English spellings, mapped to dataset keys. */
const ALIASES: Record<string, string> = { "New York": "New York City", Montreal: "Montréal", Bombay: "Mumbai", Saigon: "Ho Chi Minh City", Peking: "Beijing" };

/** Resolves a stored city string: the exact key, an alias, or "Name, CC" in either form. */
export function cityByName(name: string | null | undefined): City | undefined {
  if (!name) return undefined;
  return byName.get(name) ?? byName.get(ALIASES[name] ?? "") ?? byNameCc.get(name.toLowerCase());
}
export function isCity(name: string): boolean {
  return Boolean(cityByName(name));
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const index = CITIES.map((c) => ({ c, name: fold(c.name), country: fold(countryName(c.cc)) }));
const byPop = (a: City, b: City) => b.population - a.population;

/**
 * Typeahead over city names and country names: "reyk" and "iceland" both find Reykjavík.
 * City-name matches rank first (prefix, then anywhere), then country matches, biggest cities first.
 */
export function searchCities(q: string, limit = 12): City[] {
  const needle = fold(q.trim());
  if (needle.length < 2) return [];
  const starts: City[] = [];
  const contains: City[] = [];
  const country: City[] = [];
  for (const row of index) {
    if (row.name.startsWith(needle)) starts.push(row.c);
    else if (row.name.includes(needle)) contains.push(row.c);
    else if (row.country.startsWith(needle)) country.push(row.c);
    if (starts.length >= 400) break;
  }
  return [...starts.sort(byPop), ...contains.sort(byPop), ...country.sort(byPop)].slice(0, limit);
}
