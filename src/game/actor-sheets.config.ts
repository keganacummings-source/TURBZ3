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
