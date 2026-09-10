import type { Design, Stamp } from "@prisma/client";

export type { Design, Stamp };
export type Orientation = "land" | "port";

type Seed<T> = Omit<T, "createdAt" | "active" | "artUrl">;

/** Built-in designs. Rendered procedurally (see components/art.tsx); seeded into the database on first read. */
export const BUILTIN_DESIGNS: Seed<Design>[] = [
  { id: "classic", name: "Airmail classic", artist: "Cardpost", cost: 0, orient: "land", note: "The house postcard. Comes with every account.", featured: false, sortOrder: 0 },
  { id: "monsoon", name: "Monsoon", artist: "Priya Nair", cost: 40, orient: "land", note: "Rain over a green coastline, painted through a Kerala wet season.", featured: true, sortOrder: 1 },
  { id: "ember", name: "Ember", artist: "Deniz Aydın", cost: 40, orient: "land", note: "Rooftops in the hour before the lights come on.", featured: false, sortOrder: 2 },
  { id: "polar", name: "Polar", artist: "Sara Björk", cost: 60, orient: "land", note: "Aurora over ice. The long dark, kept.", featured: false, sortOrder: 3 },
  { id: "archipelago", name: "Archipelago", artist: "Jun Wei", cost: 50, orient: "land", note: "Islands as they look from a descending plane.", featured: false, sortOrder: 4 },
  { id: "nightpost", name: "Night post", artist: "Elin Karlsson", cost: 55, orient: "land", note: "The 2am sorting office. For letters written too late.", featured: false, sortOrder: 5 },
  { id: "lantern", name: "Lantern", artist: "Minji Park", cost: 55, orient: "port", note: "Tall format. A single lantern in a stairwell, going up.", featured: false, sortOrder: 6 },
];

export const BUILTIN_STAMPS: Seed<Stamp>[] = [
  { id: "house", name: "Standard issue", artist: "Cardpost", cost: 0, hue: 206, note: "Free, and always will be.", featured: false, sortOrder: 0 },
  { id: "crane", name: "Crane", artist: "Hana Mori", cost: 20, hue: 352, note: "One bird, one line.", featured: true, sortOrder: 1 },
  { id: "orchid", name: "Orchid", artist: "Amy Lau", cost: 20, hue: 288, note: "The national flower, badly behaved.", featured: false, sortOrder: 2 },
  { id: "beacon", name: "Beacon", artist: "Cara Byrne", cost: 25, hue: 34, note: "For cards sent to people who are far out.", featured: false, sortOrder: 3 },
  { id: "koi", name: "Koi", artist: "Jun Wei", cost: 25, hue: 14, note: "Swimming against the postmark.", featured: false, sortOrder: 4 },
  { id: "comet", name: "Comet", artist: "Sara Björk", cost: 30, hue: 250, note: "Issued once. Not reprinted.", featured: false, sortOrder: 5 },
];

export type PostageBook = { id: string; postage: number; priceCents: number; label: string; why: string };
export const BOOKS: PostageBook[] = [
  { id: "book10", postage: 10, priceCents: 190, label: "$1.90", why: "Two long-haul, or five short." },
  { id: "book30", postage: 30, priceCents: 490, label: "$4.90", why: "A season of writing." },
  { id: "book100", postage: 100, priceCents: 1390, label: "$13.90", why: "You write a lot." },
];

/** Fallback objects so a card whose design was somehow removed still renders. */
export const FALLBACK_DESIGN: Design = { ...BUILTIN_DESIGNS[0], active: true, artUrl: null, createdAt: new Date(0) };
export const FALLBACK_STAMP: Stamp = { ...BUILTIN_STAMPS[0], active: true, artUrl: null, createdAt: new Date(0) };

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "design";
