import { drawAtlasTile, tileImageRevision } from "./tile-atlas";
import {
  ANIMAL_BIOME,
  ANIMAL_BY_ID,
  BIOME_MONSTERS,
  MONSTER_BY_ID,
  NPCS,
  POIS,
  TILE,
  WORLD_H,
  WORLD_W,
  scaleTile,
  type BiomeId,
  mulberry32,
  type Rng,
} from "./content";

export type Tile = { floor: number; biome: number; block: number; decor: number; sprite?: string };
export const BIOMES: BiomeId[] = ["void", "frost", "verdant", "crown", "bone", "tide", "ashen"];
export type Spawn = {
  id: string;
  kind: "mob" | "node";
  species?: string;
  node?: "ore" | "tree" | "shroom" | "fish";
  x: number;
  y: number;
  level: number;
  boss?: boolean;
  dungeonBoss?: boolean;
  bossId?: string;
  template?: number;
  type?: string;
  animal?: boolean;
};
export type WorldData = {
  w: number;
  h: number;
  tiles: Tile[];
  spawns: Spawn[];
  cache: HTMLCanvasElement | null;
  entry?: { x: number; y: number };
};
export type Tavern = {
  id: string;
  name: string;
  biome: BiomeId;
  tx: number;
  ty: number;
  boardTx: number;
  boardTy: number;
};
const TAVERN_DESIGN: { id: string; name: string; biome: BiomeId; tx: number; ty: number }[] = [
  { id: "crown_tap", name: "Crownfall Tap", biome: "crown", tx: 27, ty: 36 },
  { id: "hollow_inn", name: "Hollow Inn", biome: "verdant", tx: 40, ty: 12 },
  { id: "march_lodge", name: "March Lodge", biome: "frost", tx: 62, ty: 8 },
  { id: "salt_house", name: "Salt House", biome: "tide", tx: 72, ty: 40 },
  { id: "kiln_bar", name: "Kiln Bar", biome: "ashen", tx: 14, ty: 52 },
  { id: "pit_rest", name: "Pit Rest", biome: "void", tx: 8, ty: 8 },
  { id: "lid_tavern", name: "Lid Tavern", biome: "bone", tx: 44, ty: 46 },
];
export const TAVERNS: Tavern[] = TAVERN_DESIGN.map((t) => {
  const p = scaleTile(t.tx, t.ty);
  return { ...t, tx: p.tx, ty: p.ty, boardTx: p.tx + 3, boardTy: p.ty + 6 };
});
export function idx(x: number, y: number, w = WORLD_W): number {
  return y * w + x;
}
function noise(x: number, y: number, seed: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function biomeIndex(x: number, y: number, seed: number): number {
  return Math.min(6, Math.floor(noise(Math.floor(x / 24), Math.floor(y / 24), seed) * 7));
}
export function buildWorld(seed: number, hardcore = false): WorldData {
  seed = (seed ^ (hardcore ? 0x6a09e667 : 0x3c6ef372)) >>> 0;
  const w = WORLD_W, h = WORLD_H;
  const tiles: Tile[] = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2;
    const b = biomeIndex(x, y, seed);
    tiles[idx(x, y)] = { floor: edge ? 1 : 0, biome: b, block: edge ? 1 : 0, decor: 0 };
  }
  const home = scaleTile(30, 32);
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const t = tiles[idx(home.tx + dx, home.ty + dy, w)];
    if (t) { t.block = 0; t.floor = 9; t.decor = 0; }
  }
  const spawns: Spawn[] = [];
  for (let y = 8; y < h - 8; y += 18) for (let x = 8; x < w - 8; x += 21) {
    spawns.push({ id: `tree-${x}-${y}`, kind: "node", node: "tree", x: x * TILE + 16, y: y * TILE + 16, level: 1 });
  }
  for (let y = 10; y < h - 10; y += 23) for (let x = 10; x < w - 10; x += 19) {
    spawns.push({ id: `ore-${x}-${y}`, kind: "node", node: "ore", x: x * TILE + 16, y: y * TILE + 16, level: 1 });
  }
  for (let y = 12; y < h - 12; y += 27) for (let x = 14; x < w - 14; x += 25) {
    spawns.push({ id: `shroom-${x}-${y}`, kind: "node", node: "shroom", x: x * TILE + 16, y: y * TILE + 16, level: 1 });
  }
  spawns.push({ id: "starter-tree", kind: "node", node: "tree", x: (home.tx + 2) * TILE + 16, y: (home.ty + 1) * TILE + 16, level: 1 });
  const ground = ["grass_0_new.png", "ice_0_new.png", "grass_0_new.png", "dirt_full_new.png", "limestone_0.png", "sand_1.png", "volcanic_floor_0.png"];
  for (const t of tiles) {
    if (t.floor === 1) continue;
    t.sprite = t.floor === 2 ? "/MapAssets/03_Water_and_Liquid_Tiles/shoals_shallow_water_0.png" :
      `/MapAssets/01_Floor_and_Ground_Tiles/${t.floor === 3 ? "dirt_full_new.png" : t.floor === 4 || t.floor === 9 ? "sandstone_floor_0.png" : ground[t.biome] ?? ground[0]}`;
  }
  return { w, h, tiles, spawns, cache: null };
}
export function paintWorld(world: WorldData): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = world.w * TILE;
  c.height = world.h * TILE;
  const g = c.getContext("2d")!;
  for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
    const t = world.tiles[idx(x, y, world.w)]!;
    if (t.sprite && drawAtlasTile(g, t.sprite, x * TILE, y * TILE, TILE)) continue;
    g.fillStyle = "#4f9a45";
    g.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
  world.cache = c;
  return c;
}
export function drawWorldSlice(ctx: CanvasRenderingContext2D, world: WorldData, cx: number, cy: number, vw: number, vh: number, zoom: number) {
  if (world.cache) ctx.drawImage(world.cache, 0, 0);
}
export const WORLD_RETURN: Record<string, { x: number; y: number }> = {
  crypt: (() => { const p = scaleTile(41, 47); return { x: p.tx * TILE + 16, y: p.ty * TILE }; })(),
  kiln: (() => { const p = scaleTile(18, 55); return { x: p.tx * TILE + 16, y: p.ty * TILE }; })(),
};
