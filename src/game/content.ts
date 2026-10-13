export type TypeId =
  | "normal"
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "electric"
  | "ice"
  | "void"
  | "light"
  | "spirit"
  | "ghoul";

export type Slot = "weapon" | "head" | "chest" | "legs" | "feet" | "relic";
export type QualityId = "worn" | "common" | "fine" | "rare" | "epic" | "legendary";
export type RaceId = "vesper" | "cinder" | "tide" | "thorn" | "rime";
export type MapId = "world" | "crypt" | "kiln";
export type FxId =
  | "voidring"
  | "solarnova"
  | "tidalsurge"
  | "briarburst"
  | "whitestorm"
  | "gravepulse"
  | "stormcrown"
  | "lanternwake"
  | "featherfall"
  | "bloodmoon";

export const TILE = 32;
export const WORLD_W = 420;
export const WORLD_H = 288;

/** POIs were laid out on the old 84×60 chart. The live map stretches them. */
export function scaleTile(tx: number, ty: number): { tx: number; ty: number } {
  return {
    tx: Math.max(3, Math.min(WORLD_W - 4, Math.round(tx * (WORLD_W / 84)))),
    ty: Math.max(3, Math.min(WORLD_H - 4, Math.round(ty * (WORLD_H / 60)))),
  };
}

/** Spawn level sits on the hunter, five levels either side. */
export function levelNearHunter(hunter: number, roll: number): number {
  const delta = Math.floor(roll * 11) - 5;
  return Math.max(1, Math.floor(hunter) + delta);
}

/** 0 common, 1 uncommon, 2 rare, 3 epic. Higher levels shift the roll up. */
export function rarityForLevel(level: number, roll: number, boss = false): number {
  if (boss) return 3;
  const t = Math.max(0, Math.min(1, (level - 1) / 40));
  const epic = 0.04 + t * 0.28;
  const rare = 0.1 + t * 0.24;
  const uncommon = 0.2 + t * 0.16;
  if (roll < epic) return 3;
  if (roll < epic + rare) return 2;
  if (roll < epic + rare + uncommon) return 1;
  return 0;
}

export const TYPES: Record<
  TypeId,
  { name: string; color: string; strong: TypeId[]; weak: TypeId[]; immune: TypeId[] }
> = {
  normal: { name: "Normal", color: "#c8c0b0", strong: [], weak: ["earth", "spirit"], immune: [] },
  fire: { name: "Fire", color: "#e25a32", strong: ["ice", "void"], weak: ["water", "earth"], immune: [] },
  water: { name: "Water", color: "#3a7eb8", strong: ["fire", "earth"], weak: ["electric", "ice"], immune: [] },
  earth: { name: "Earth", color: "#8a6a3a", strong: ["fire", "electric"], weak: ["water", "air"], immune: ["electric"] },
  air: { name: "Air", color: "#9ad8c8", strong: ["earth", "spirit"], weak: ["electric", "ice"], immune: ["earth"] },
  electric: { name: "Electric", color: "#f2d43a", strong: ["water", "air"], weak: ["earth", "void"], immune: [] },
  ice: { name: "Ice", color: "#9ad0ff", strong: ["air", "earth"], weak: ["fire", "light"], immune: [] },
  void: { name: "Void", color: "#6a4cff", strong: ["spirit", "normal"], weak: ["light"], immune: [] },
  light: { name: "Light", color: "#fff1a8", strong: ["void", "spirit"], weak: ["fire", "earth"], immune: [] },
  spirit: { name: "Spirit", color: "#c9a6e8", strong: ["spirit", "ice"], weak: ["void"], immune: ["normal"] },
  ghoul: { name: "Ghoul", color: "#8d72a8", strong: ["spirit", "void"], weak: ["light", "fire"], immune: [] },
};

export const TYPE_IDS = Object.keys(TYPES) as TypeId[];

export function typeMult(atk: TypeId, def: TypeId): number {
  if (TYPES[def].immune.includes(atk)) return 0;
  if (TYPES[atk].strong.includes(def)) return 2;
  if (TYPES[atk].weak.includes(def)) return 0.5;
  return 1;
}

// NOTE: Full content restored from previous commit. Class update will be applied in a follow-up commit with the complete file.
