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

/** Ensures the built-in designs exist. Runs once per fresh database. */
async function ensureBuiltins() {
  const n = await db.design.count();
  if (n === 0) await db.design.createMany({ data: BUILTIN_DESIGNS, skipDuplicates: true });
  const m = await db.stamp.count();
  if (m === 0) await db.stamp.createMany({ data: BUILTIN_STAMPS, skipDuplicates: true });
}

/** The full catalogue, active and retired, cached per request. Old cards must keep rendering retired designs. */
export const getCatalogue = cache(async (): Promise<Catalogue> => {
  await ensureBuiltins();
  const [designs, stamps] = await Promise.all([
    db.design.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.stamp.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const dm = new Map(designs.map((d) => [d.id, d]));
  const sm = new Map(stamps.map((s) => [s.id, s]));
  return {
    designs,
    stamps,
    design: (id) => dm.get(id) ?? FALLBACK_DESIGN,
    stamp: (id) => sm.get(id) ?? FALLBACK_STAMP,
  };
});
