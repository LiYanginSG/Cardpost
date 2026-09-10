import { cityByName } from "./cities";

const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km between two named cities. Unknown cities count as 0 km apart. */
export function haversineKm(a: string, b: string): number {
  const A = cityByName(a);
  const B = cityByName(b);
  if (!A || !B) return 0;
  const dLa = rad(B.lat - A.lat);
  const dLo = rad(B.lon - A.lon);
  const h =
    Math.sin(dLa / 2) ** 2 +
    Math.cos(rad(A.lat)) * Math.cos(rad(B.lat)) * Math.sin(dLo / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)));
}

export const DAY_MS = 86_400_000;
export const MIN_DAYS = 2;
export const MAX_DAYS = 14;
export const MAX_COST = 8;

/** Delivery days: distance / 1100, clamped to 2..14. */
export const deliveryDays = (km: number) =>
  Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.round(km / 1100)));

/** Postage cost: ceil(distance / 1500), clamped to 1..8. */
export const postageCost = (km: number) =>
  Math.max(1, Math.min(MAX_COST, Math.ceil(km / 1500)));

export function arrivalDate(sentAt: Date, km: number): Date {
  return new Date(sentAt.getTime() + deliveryDays(km) * DAY_MS);
}

/** Total km travelled along a chain of cities; unique cities visited. */
export function routeStats(cities: string[]) {
  let total = 0;
  for (let i = 1; i < cities.length; i++) total += haversineKm(cities[i - 1], cities[i]);
  return { totalKm: total, uniqueCities: new Set(cities).size, hops: cities.length };
}

export const fmtKm = (km: number) => `${km.toLocaleString("en-US")} km`;
