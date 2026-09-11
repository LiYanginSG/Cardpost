import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { BUILTIN_DESIGNS, BUILTIN_STAMPS, FALLBACK_DESIGN, FALLBACK_STAMP, type Design, type Stamp } from "@/lib/catalogue";

export type Catalogue = {
  designs: Design[];
  stamps: Stamp[];
  design: (id: string) => Design;
  stamp: (id: string) => Stamp;
};

const order = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** The full catalogue, active and retired, cached per request. Old cards must keep rendering retired designs. */
export const getCatalogue = cache(async (): Promise<Catalogue> => {
  let [designs, stamps] = await Promise.all([db.design.findMany({ orderBy: order }), db.stamp.findMany({ orderBy: order })]);
  // Fresh database: seed the built-ins once. Costs nothing on later requests.
  if (designs.length === 0) {
    await db.design.createMany({ data: BUILTIN_DESIGNS, skipDuplicates: true });
    designs = await db.design.findMany({ orderBy: order });
  }
  if (stamps.length === 0) {
    await db.stamp.createMany({ data: BUILTIN_STAMPS, skipDuplicates: true });
    stamps = await db.stamp.findMany({ orderBy: order });
  }
  const dm = new Map(designs.map((d) => [d.id, d]));
  const sm = new Map(stamps.map((s) => [s.id, s]));
  return {
    designs,
    stamps,
    design: (id) => dm.get(id) ?? FALLBACK_DESIGN,
    stamp: (id) => sm.get(id) ?? FALLBACK_STAMP,
  };
});
