// actor-sheets.config.ts
// Character textures come from the Antifarea 16x18 charset sheets in /public/sprites.
// See repo history for full sheet maps; SCALE set for one tile.

import type { AtlasSpec, AtlasKeyEntry } from "./sprite-atlas";

export const ACTOR_FRAME_W = 16;
export const ACTOR_FRAME_H = 18;
export const ACTOR_WALK_FRAMES = 3;
const WALK_CYCLE = [1, 0, 1, 2] as const;

export function actorWalkFrame(walk: number, moving = true): number {
  if (!moving) return 1;
  return WALK_CYCLE[Math.floor(Math.abs(walk)) % WALK_CYCLE.length]!;
}
export const ACTOR_ROWS = 4;

const BLOCK_W = ACTOR_FRAME_W * ACTOR_WALK_FRAMES;
const ORIGIN_X = 16;
const BAND_TOP = 180;
const BAND_BOTTOM = 306;

export const ACTOR_BG: [number, number, number] = [239, 208, 116];
export const ACTOR_TOLERANCE = 0;
export const ACTOR_SPRITE_SCALE = 2;

export const ROW_UP = 0;
export const ROW_RIGHT = 1;
export const ROW_DOWN = 2;
export const ROW_LEFT = 3;

export type SheetId = "core" | "second" | "third";
export type BandId = "m" | "f" | "a";
export type SpriteSlot = { sheet: SheetId; band: BandId; index: number };
export type CharacterSlot = {
  sheet: SheetId;
  index: number;
  gendered?: boolean;
  band?: BandId;
};

export const ACTOR_DIRECTION_ROWS: Record<string, number> = {
  up: ROW_UP,
  right: ROW_RIGHT,
  down: ROW_DOWN,
  left: ROW_LEFT,
};

function bandSpec(sheet: SheetId, band: BandId, bg: [number, number, number]): AtlasSpec {
  const y0 = band === "f" || (band === "a" && sheet === "third") ? BAND_BOTTOM : BAND_TOP;
  const keys: AtlasKeyEntry[] = [];
  for (let i = 0; i < 6; i++) {
    for (let row = 0; row < 4; row++) {
      for (let frame = 0; frame < 3; frame++) {
        keys.push({
          key: `${sheet}-${band}-${i}-${row}-${frame}`,
          x: ORIGIN_X + i * BLOCK_W + frame * ACTOR_FRAME_W,
          y: y0 + row * ACTOR_FRAME_H,
          w: ACTOR_FRAME_W,
          h: ACTOR_FRAME_H,
        });
      }
    }
  }
  return {
    id: `${sheet}-${band}`,
    src: `/sprites/antifarea_${sheet}.png`,
    keys,
    chroma: bg,
    chromaTol: ACTOR_TOLERANCE,
  };
}

export const ACTOR_ATLASES = [
  { id: "core" as const, spec: bandSpec("core", "m", ACTOR_BG) },
  { id: "core-f" as const, spec: bandSpec("core", "f", ACTOR_BG) },
  { id: "second" as const, spec: bandSpec("second", "m", ACTOR_BG) },
  { id: "second-f" as const, spec: bandSpec("second", "f", ACTOR_BG) },
  { id: "third" as const, spec: bandSpec("third", "a", ACTOR_BG) },
  { id: "third-npc" as const, spec: bandSpec("third", "f", ACTOR_BG) },
];

export const RACE_SLOTS: Record<string, CharacterSlot> = {
  vesper: { sheet: "core", index: 0, gendered: true },
  ember: { sheet: "core", index: 1, gendered: true },
  tide: { sheet: "core", index: 2, gendered: true },
  moss: { sheet: "core", index: 3, gendered: true },
  rime: { sheet: "core", index: 4, gendered: true },
  gale: { sheet: "core", index: 5, gendered: true },
};

export const CLASS_SLOTS: Record<string, CharacterSlot> = {
  spiritbinder: { sheet: "second", index: 0, gendered: true },
  ghoulknight: { sheet: "second", index: 1, gendered: true },
  stormrider: { sheet: "second", index: 2, gendered: true },
  voidwalker: { sheet: "second", index: 3, gendered: true },
  lightbringer: { sheet: "second", index: 4, gendered: true },
};

export const NPC_SHEET: SheetId = "third";
export const NPC_BAND: BandId = "f";
export const NPC_SLOTS_BY_ID: Record<string, number> = {
  holt: 0,
  lise: 1,
  bram: 2,
  ada: 3,
  wren: 4,
  keel: 5,
};

export function resolveSlot(slot: CharacterSlot, female: boolean): SpriteSlot {
  const band: BandId = slot.gendered ? (female ? "f" : "m") : (slot.band ?? "a");
  return { sheet: slot.sheet, band, index: slot.index };
}
