// sprite-atlas.config.ts
// Character sprites now come from the roguelike/charset sheets in /public/sprites.
// Armor/piece system removed. Actors use full-body class sprites.

import { buildKeyMap, type AtlasSpec } from "./sprite-atlas";

export const actorGrid = {
  cellW: 48,
  cellH: 72,
  cols: 6,
  rows: 5,
  originX: 0,
  originY: 0,
  gapX: 0,
  gapY: 0,
  inset: 1,
  tighten: true,
};

export const actorAtlasSpec: AtlasSpec = {
  src: "/sprites/charsets_12_m-f_complete_by_antifarea.png",
  grid: actorGrid,
  chromaKey: [0, 0, 0],
  tolerance: 16,
  sprites: {
    "class:warden": { col: 0, row: 0 },
    "class:pyromancer": { col: 1, row: 0 },
    "class:tidecaller": { col: 2, row: 0 },
    "class:briarmage": { col: 3, row: 0 },
    "class:frostblade": { col: 0, row: 1 },
    "class:voidwalker": { col: 1, row: 1 },
    "class:lightbringer": { col: 2, row: 1 },
    "class:spiritbinder": { col: 3, row: 1 },
    "class:ghoulknight": { col: 0, row: 2 },
    "class:stormrider": { col: 1, row: 2 },
    "class:shadowdancer": { col: 2, row: 2 },
    "class:ironclad": { col: 3, row: 2 },
    "class:wildheart": { col: 0, row: 3 },
    "class:runesmith": { col: 1, row: 3 },
    "class:bloodreaver": { col: 2, row: 3 },
    "class:aetherist": { col: 3, row: 3 },
    "class:gravekeeper": { col: 0, row: 4 },
    "class:skyarcher": { col: 1, row: 4 },
    "class:plaguebearer": { col: 2, row: 4 },
    "class:chronomancer": { col: 3, row: 4 },
  },
};

export const bodyKey = (race: string, female: boolean, skin: number) =>
  `body:${race}:${female ? "f" : "m"}:${skin}`;
export const pieceKey = (slot: string, style: number, type: string) =>
  `${slot}:${style}:${type}`;
export const classKey = (classId: string) => `class:${classId}`;
