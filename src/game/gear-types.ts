import { TYPE_IDS, TYPES, packMoves, type TypeId, type Gear, type Rng } from "./content";

function stripTypePrefix(name: string): string {
  return name.replace(
    /\b(Normal|Fire|Water|Earth|Air|Electric|Ice|Void|Light|Spirit|Ghoul)\/?((Normal|Fire|Water|Earth|Air|Electric|Ice|Void|Light|Spirit|Ghoul)\/?)*\s+/gi,
    "",
  );
}
function injectQualityType(name: string, typeLabel: string): string {
  return name.replace(/^(Worn|Common|Fine|Rare|Epic|Legendary)\s+/i, `$1 ${typeLabel} `);
}

/** Roll type(s) the first time a piece is picked up. Weapons: 1–4 types. Armor: one type. */
export function awakenGearType(g: Gear, rng: Rng = Math.random): Gear {
  const anyG = g as Gear & { typeless?: boolean; types?: TypeId[] };
  if (!anyG.typeless && (g as { type: string }).type !== "typeless") return g;
  if (g.slot === "weapon") {
    const n = Math.min(4, 1 + Math.floor(rng() * (1 + Math.min(3, g.level / 12))));
    const pool = [...TYPE_IDS];
    const types: TypeId[] = [];
    for (let i = 0; i < n && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      types.push(pool.splice(idx, 1)[0]!);
    }
    anyG.types = types;
    g.type = types[0] ?? "normal";
    const typeLabel = types.map((t) => TYPES[t].name).join("/");
    g.name = stripTypePrefix(g.name);
    g.name = injectQualityType(g.name, typeLabel);
  } else {
    const t = poolPick(rng, TYPE_IDS);
    g.type = t;
    anyG.types = [t];
    g.name = stripTypePrefix(g.name);
    g.name = injectQualityType(g.name, TYPES[t].name);
  }
  anyG.typeless = false;
  if (!g.moves?.length) {
    g.moves = packMoves(rng, g.type as TypeId, rng() < 0.42 ? 2 : 1);
  }
  return g;
}

function poolPick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}
