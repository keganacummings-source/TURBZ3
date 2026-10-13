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
/** Characters are drawn 2x: a 16px frame becomes exactly one 32px tile wide, so they fit 1x1 hallways. */
export const ACTOR_SPRITE_SCALE = 2;

export const ROW_UP = 0;
export const ROW_RIGHT = 1;
export const ROW_DOWN = 2;
export const ROW_LEFT = 3;

export const ACTOR_DIRECTION_ROWS = { up: ROW_UP, right: ROW_RIGHT, down: ROW_DOWN, left: ROW_LEFT } as const;

export type ActorDirection = keyof typeof ACTOR_DIRECTION_ROWS;

/** Keep the last facing when stopped; use actual movement after collision. */
export function directionFromDelta(dx: number, dy: number, previous: ActorDirection = "down"): ActorDirection {
  if (Math.hypot(dx, dy) < 0.001) return previous;
  return Math.abs(dx) >= Math.abs(dy)
    ? (dx < 0 ? "left" : "right")
    : (dy < 0 ? "up" : "down");
}

export type SheetId = "core" | "second" | "third";
export type BandId = "m" | "f" | "a" | "b";
export type SpriteSlot = { sheet: SheetId; band: BandId; index: number };

const SHEET_SRC: Record<SheetId, string> = {
  core: "/sprites/charsets_12_m-f_complete_by_antifarea.png",
  second: "/sprites/charsets_16x18-2.png",
  third: "/sprites/charsets_12_3rd_sheet.png",
};

const SHEET_BANDS: Record<SheetId, BandId[]> = {
  core: ["m", "f"],
  second: ["m", "f"],
  third: ["a", "b"],
};

export const SLOTS_PER_BAND = 6;

export const spriteKey = (slot: SpriteSlot, row: number, frame: number): string =>
  `${slot.sheet}|${slot.band}${slot.index}|d${row}f${frame}`;

function bandY(band: BandId): number {
  return band === "a" || band === "m" ? BAND_TOP : BAND_BOTTOM;
}

// Every frame of every character becomes its own atlas rect, so a draw call
// never has to do arithmetic and can never mis-slice a neighbouring frame.
function buildSpec(id: SheetId): AtlasSpec {
  const sprites: Record<string, AtlasKeyEntry> = {};
  for (const band of SHEET_BANDS[id]) {
    for (let index = 0; index < SLOTS_PER_BAND; index++) {
      for (let row = 0; row < ACTOR_ROWS; row++) {
        for (let frame = 0; frame < ACTOR_WALK_FRAMES; frame++) {
          sprites[spriteKey({ sheet: id, band, index }, row, frame)] = {
            x: ORIGIN_X + index * BLOCK_W + frame * ACTOR_FRAME_W,
            y: bandY(band) + row * ACTOR_FRAME_H,
            w: ACTOR_FRAME_W,
            h: ACTOR_FRAME_H,
            chromaKey: id === "third" ? [254, 197, 197] : band === "m" ? [123, 213, 254] : [246, 139, 205],
          };
        }
      }
    }
  }
  return { src: SHEET_SRC[id], chromaKey: ACTOR_BG, tolerance: ACTOR_TOLERANCE, sprites };
}

export const ACTOR_ATLASES: { id: SheetId; spec: AtlasSpec }[] = (
  Object.keys(SHEET_SRC) as SheetId[]
).map((id) => ({ id, spec: buildSpec(id) }));

export type CharacterSlot = {
  sheet: SheetId;
  index: number;
  /** true = pick male or female band from the actor, false = fixed band */
  gendered: boolean;
  band?: BandId;
};

// The five playable races each get their own sheet character.
export const RACE_SLOTS: Record<string, CharacterSlot> = {
  vesper: { sheet: "core", index: 0, gendered: true },
  cinder: { sheet: "core", index: 1, gendered: true },
  tide: { sheet: "core", index: 2, gendered: true },
  thorn: { sheet: "core", index: 4, gendered: true },
  rime: { sheet: "second", index: 3, gendered: true },
};

// The ten playable classes use distinct characters from the sheets.
export const CLASS_SLOTS: Record<string, CharacterSlot> = {
  warden: { sheet: "core", index: 0, gendered: true },
  pyromancer: { sheet: "third", index: 0, gendered: false, band: "a" },
  tidecaller: { sheet: "third", index: 1, gendered: false, band: "a" },
  briarmage: { sheet: "third", index: 3, gendered: false, band: "a" },
  frostblade: { sheet: "second", index: 3, gendered: true },
  voidwalker: { sheet: "third", index: 5, gendered: false, band: "a" },
  lightbringer: { sheet: "third", index: 4, gendered: false, band: "a" },
  spiritbinder: { sheet: "core", index: 2, gendered: true },
  ghoulknight: { sheet: "second", index: 2, gendered: true },
  stormrider: { sheet: "third", index: 2, gendered: false, band: "a" },
};

export const NPC_SHEET: SheetId = "third";
export const NPC_BAND: BandId = "b";
export const NPC_SLOTS_BY_ID: Record<string, number> = {
  miret: 1,
  vey: 4,
  orien: 0,
  holt: 2,
  lise: 3,
  bram: 4,
  ada: 1,
  brask: 4,
  wren: 5,
  keel: 0,
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