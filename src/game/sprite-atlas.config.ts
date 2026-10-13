// sprite-atlas.config.ts
// ---------------------------------------------------------------------------
// Atlas config for the character/equipment sheet. This is the ONE file you
// edit to point at your real sheet and map sprite keys to cells/rects.
//
// The key strings MUST match the scheme used by actor-sprites.ts:
//   body  -> `body:{race}:{f|m}:{skin}`
//   piece -> `{slot}:{style}:{type}`   (slot: weapon|head|chest|legs|feet|relic)
//
// Step 1: put the sheet in /public (e.g. /public/sprites/characters.png) and set
//         `src` below to "/sprites/characters.png".
// Step 2: measure the grid (cell size, columns/rows, origin). Open the sheet in
//         an editor and read off one cell's pixel size. Fill in `actorGrid`.
// Step 3: list the keys you actually have in the sheet in `actorAtlasSpec.sprites`.
//         Use {col,row} for grid cells, or {x,y,w,h} for explicit rects. Use
//         buildKeyMap() if your sheet packs sprites in row-major order.
// ---------------------------------------------------------------------------

import { buildKeyMap, type AtlasSpec } from "./sprite-atlas";

// TODO: measure from your actual sheet.
export const actorGrid = {
  cellW: 32, // <-- width of one cell in px
  cellH: 32, // <-- height of one cell in px
  cols: 16, // <-- number of columns in the grid
  rows: 16, // <-- number of rows in the grid
  originX: 0, // <-- top-left x of the first cell (if there's a margin)
  originY: 0, // <-- top-left y of the first cell
  gapX: 0, // <-- horizontal gap between cells (0 if packed)
  gapY: 0, // <-- vertical gap between cells (0 if packed)
  inset: 1, // <-- px trimmed off each slice edge to stop bleeding (fix #2)
  tighten: true, // <-- shrink each cell to the non-black bbox (fix #3)
};

// The sheet's background is pure black with no alpha. Chroma-keying it to
// transparent at load time is fix #1. Keep [0,0,0] unless your sheet uses a
// different background colour.
export const actorAtlasSpec: AtlasSpec = {
  src: "/sprites/characters.png", // <-- path under /public
  grid: actorGrid,
  chromaKey: [0, 0, 0],
  tolerance: 16,
  sprites: {
    // --- Bodies (top rows of the sheet). Add one per race/sex/skin you have. ---
    "body:vesper:m:0": { col: 0, row: 0 },
    "body:vesper:f:0": { col: 1, row: 0 },
    "body:cinder:m:0": { col: 2, row: 0 },
    "body:cinder:f:0": { col: 3, row: 0 },
    // ...add the rest of your bodies here.

    // --- Outfit pieces. `{slot}:{style}:{type}`. Add the variants you have. ---
    "chest:0:fire": { col: 0, row: 4 },
    "chest:0:water": { col: 1, row: 4 },
    "head:0:fire": { col: 0, row: 5 },
    "weapon:0:normal": { col: 0, row: 6 },
    // ...add the rest of your pieces here.
  },
};

// Helpers to generate keys in the exact scheme actor-sprites.ts expects, so the
// `sprites` map above stays in sync with the renderer's lookup.
export const bodyKey = (race: string, female: boolean, skin: number) =>
  `body:${race}:${female ? "f" : "m"}:${skin}`;
export const pieceKey = (slot: string, style: number, type: string) =>
  `${slot}:${style}:${type}`;

// If your sheet packs sprites in row-major order, generate the `sprites` map
// from an ordered key list instead of hand-typing each cell:
//
//   const sprites = buildKeyMap(
//     [bodyKey("vesper", false, 0), bodyKey("vesper", true, 0), ...],
//     actorGrid,
//   );
//   export const actorAtlasSpec: AtlasSpec = { ...actorAtlasSpec, sprites };
