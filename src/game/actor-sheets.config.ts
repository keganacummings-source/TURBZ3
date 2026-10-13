// actor-sheets.config.ts
// Character textures come from the Antifarea 16x18 charset sheets in /public/sprites.
//
// Sheet anatomy, measured from the source PNGs rather than assumed:
//   - every character is a 48x72 block
//   - the block is 3 walk frames wide (16px) and 4 facing rows tall (18px)
//   - blocks start at x = 16, sit edge to edge, six per band
//   - two bands per sheet, y = 180 and y = 306
//       core / second : band 180 male art, band 306 female art
//       third         : band 180 elementals, band 306 npc art
//   - each band has its own flat background color, chroma-keyed per frame
// Antifarea rows run 0 up, 1 right, 2 down, 3 left.

import type { AtlasSpec, AtlasKeyEntry } from "./sprite-atlas";

export const ACTOR_FRAME_W = 16;
export const ACTOR_FRAME_H = 18;
export const ACTOR_WALK_FRAMES = 3;
const WALK_CYCLE = [1, 0, 1, 2] as const;

/** walk advances six beats per second; the center frame is the standing pose. */
export function actorWalkFrame(walk: number, moving = true): number {
  if (!moving) return 1;
  return WALK_CYCLE[Math.floor(Math.abs(walk)) % WALK_CYCLE.length]!;
}
export const ACTOR_ROWS = 4;

const BLOCK_W = ACTOR_FRAME_W * ACTOR_WALK_FRAMES; // 48
const ORIGIN_X = 16;
const BAND_TOP = 180;
const BAND_BOTTOM = 306;

export const ACTOR_BG: [number, number, number] = [239, 208, 116];
export const ACTOR_TOLERANCE = 0;
export const ACTOR_SPRITE_SCALE = 2; // one tile (32px) full size

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

function bandY(band: BandId): number {
  return band === "f" ? BAND_BOTTOM : BAND_TOP;
}

function makeSpec(sheet: SheetId, band: BandId): AtlasSpec {
  const keys: AtlasKeyEntry[] = [];
  for (let i = 0; i < 6; i++) {
    for (let row = 0; row < 4; row++) {
      for (let frame = 0; frame < 3; frame++) {
        keys.push({
          key: `${sheet}-${band}-${i}-r${row}-f${frame}`,
          x: ORIGIN_X + i * BLOCK_W + frame * ACTOR_FRAME_W,
          y: bandY(band) + row * ACTOR_FRAME_H,
          w: ACTOR_FRAME_W,
          h: ACTOR_FRAME_H,
        });
      }
    }
  }
  return {
    id: `${sheet}-${band}`,
    src: `/sprites/antifarea_${sheet === "core" ? "1" : sheet === "second" ? "2" : "3"}.png`,
    keys,
    chroma: ACTOR_BG,
    chromaTol: ACTOR_TOLERANCE,
  };
}

export const ACTOR_ATLASES: { id: SheetId; spec: AtlasSpec }[] = (
  ["core", "second", "third"] as SheetId[]
).flatMap((sheet) =>
  (["m", "f"] as BandId[]).map((band) => ({
    id: sheet,
    spec: makeSpec(sheet, band),
  })),
);

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
  pike: 3,
  nessa: 2,
  moss: 1,
  brine: 0,
  sleet: 4,
  cinderkin: 3,
};

export function resolveSlot(slot: CharacterSlot, female: boolean): SpriteSlot {
  const band: BandId = slot.gendered ? (female ? "f" : "m") : (slot.band ?? "a");
  return { sheet: slot.sheet, band, index: slot.index };
}
