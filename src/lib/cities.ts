export type City = { name: string; lat: number; lon: number; cc: string };

export const CITIES: City[] = [
  { name: "Singapore", lat: 1.29, lon: 103.85, cc: "SG" },
  { name: "Kuala Lumpur", lat: 3.14, lon: 101.69, cc: "MY" },
  { name: "Jakarta", lat: -6.21, lon: 106.85, cc: "ID" },
  { name: "Bangkok", lat: 13.76, lon: 100.5, cc: "TH" },
  { name: "Manila", lat: 14.6, lon: 120.98, cc: "PH" },
  { name: "Hong Kong", lat: 22.32, lon: 114.17, cc: "HK" },
  { name: "Taipei", lat: 25.03, lon: 121.57, cc: "TW" },
  { name: "Tokyo", lat: 35.68, lon: 139.65, cc: "JP" },
  { name: "Seoul", lat: 37.57, lon: 126.98, cc: "KR" },
  { name: "Shanghai", lat: 31.23, lon: 121.47, cc: "CN" },
  { name: "Mumbai", lat: 19.08, lon: 72.88, cc: "IN" },
  { name: "Delhi", lat: 28.61, lon: 77.21, cc: "IN" },
  { name: "Dubai", lat: 25.2, lon: 55.27, cc: "AE" },
  { name: "Istanbul", lat: 41.01, lon: 28.98, cc: "TR" },
  { name: "Nairobi", lat: -1.29, lon: 36.82, cc: "KE" },
  { name: "Cape Town", lat: -33.92, lon: 18.42, cc: "ZA" },
  { name: "Lagos", lat: 6.52, lon: 3.38, cc: "NG" },
  { name: "Cairo", lat: 30.04, lon: 31.24, cc: "EG" },
  { name: "Helsinki", lat: 60.17, lon: 24.94, cc: "FI" },
  { name: "Stockholm", lat: 59.33, lon: 18.07, cc: "SE" },
  { name: "Reykjavík", lat: 64.15, lon: -21.94, cc: "IS" },
  { name: "Dublin", lat: 53.35, lon: -6.26, cc: "IE" },
  { name: "London", lat: 51.51, lon: -0.13, cc: "GB" },
  { name: "Paris", lat: 48.86, lon: 2.35, cc: "FR" },
  { name: "Berlin", lat: 52.52, lon: 13.4, cc: "DE" },
  { name: "Amsterdam", lat: 52.37, lon: 4.9, cc: "NL" },
  { name: "Lisbon", lat: 38.72, lon: -9.14, cc: "PT" },
  { name: "Madrid", lat: 40.42, lon: -3.7, cc: "ES" },
  { name: "Rome", lat: 41.9, lon: 12.5, cc: "IT" },
  { name: "Athens", lat: 37.98, lon: 23.73, cc: "GR" },
  { name: "New York", lat: 40.71, lon: -74.01, cc: "US" },
  { name: "San Francisco", lat: 37.77, lon: -122.42, cc: "US" },
  { name: "Los Angeles", lat: 34.05, lon: -118.24, cc: "US" },
  { name: "Chicago", lat: 41.88, lon: -87.63, cc: "US" },
  { name: "Vancouver", lat: 49.28, lon: -123.12, cc: "CA" },
  { name: "Montreal", lat: 45.5, lon: -73.57, cc: "CA" },
  { name: "Toronto", lat: 43.65, lon: -79.38, cc: "CA" },
  { name: "Mexico City", lat: 19.43, lon: -99.13, cc: "MX" },
  { name: "Lima", lat: -12.05, lon: -77.04, cc: "PE" },
  { name: "Buenos Aires", lat: -34.6, lon: -58.38, cc: "AR" },
  { name: "São Paulo", lat: -23.55, lon: -46.63, cc: "BR" },
  { name: "Sydney", lat: -33.87, lon: 151.21, cc: "AU" },
  { name: "Melbourne", lat: -37.81, lon: 144.96, cc: "AU" },
  { name: "Perth", lat: -31.95, lon: 115.86, cc: "AU" },
  { name: "Auckland", lat: -36.85, lon: 174.76, cc: "NZ" },
];

const byName = new Map(CITIES.map((c) => [c.name, c]));
export function cityByName(name: string | null | undefined): City | undefined {
  return name ? byName.get(name) : undefined;
}
export function isCity(name: string): boolean {
  return byName.has(name);
}
