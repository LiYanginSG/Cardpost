export type Orientation = "land" | "port";

export type Design = {
  id: string;
  name: string;
  artist: string;
  cost: number; // in postage; 0 = included with every account
  orient: Orientation;
  note: string;
  featured?: boolean;
};

export type Stamp = {
  id: string;
  name: string;
  artist: string;
  cost: number;
  hue: number;
  note: string;
  featured?: boolean;
};

export const DESIGNS: Design[] = [
  { id: "classic", name: "Airmail classic", artist: "Cardpost", cost: 0, orient: "land", note: "The house postcard. Comes with every account." },
  { id: "monsoon", name: "Monsoon", artist: "Priya Nair", cost: 40, orient: "land", note: "Rain over a green coastline, painted through a Kerala wet season.", featured: true },
  { id: "ember", name: "Ember", artist: "Deniz Aydın", cost: 40, orient: "land", note: "Rooftops in the hour before the lights come on." },
  { id: "polar", name: "Polar", artist: "Sara Björk", cost: 60, orient: "land", note: "Aurora over ice. The long dark, kept." },
  { id: "archipelago", name: "Archipelago", artist: "Jun Wei", cost: 50, orient: "land", note: "Islands as they look from a descending plane." },
  { id: "nightpost", name: "Night post", artist: "Elin Karlsson", cost: 55, orient: "land", note: "The 2am sorting office. For letters written too late." },
  { id: "lantern", name: "Lantern", artist: "Minji Park", cost: 55, orient: "port", note: "Tall format. A single lantern in a stairwell, going up." },
];

export const STAMPS: Stamp[] = [
  { id: "house", name: "Standard issue", artist: "Cardpost", cost: 0, hue: 206, note: "Free, and always will be." },
  { id: "crane", name: "Crane", artist: "Hana Mori", cost: 20, hue: 352, note: "One bird, one line.", featured: true },
  { id: "orchid", name: "Orchid", artist: "Amy Lau", cost: 20, hue: 288, note: "The national flower, badly behaved." },
  { id: "beacon", name: "Beacon", artist: "Cara Byrne", cost: 25, hue: 34, note: "For cards sent to people who are far out." },
  { id: "koi", name: "Koi", artist: "Jun Wei", cost: 25, hue: 14, note: "Swimming against the postmark." },
  { id: "comet", name: "Comet", artist: "Sara Björk", cost: 30, hue: 250, note: "Issued once. Not reprinted." },
];

export type PostageBook = { id: string; postage: number; priceCents: number; label: string; why: string };
export const BOOKS: PostageBook[] = [
  { id: "book10", postage: 10, priceCents: 190, label: "$1.90", why: "Two long-haul, or five short." },
  { id: "book30", postage: 30, priceCents: 490, label: "$4.90", why: "A season of writing." },
  { id: "book100", postage: 100, priceCents: 1390, label: "$13.90", why: "You write a lot." },
];

export const designById = (id: string): Design => DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];
export const stampById = (id: string): Stamp => STAMPS.find((s) => s.id === id) ?? STAMPS[0];
