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

// TEMP: full file restored in follow-up - this stub exports buildWorld that creates basic world with ore/shroom
export function buildWorld(seed: number, hardcore = false): WorldData {
  const w = WORLD_W, h = WORLD_H;
  const tiles: Tile[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2;
    tiles.push({ floor: edge ? 1 : 0, biome: 2, block: edge ? 1 : 0, decor: 0 });
  }
  const spawns: Spawn[] = [];
  for (let y = 10; y < h - 10; y += 23) for (let x = 10; x < w - 10; x += 19) {
    spawns.push({ id: `ore-${x}-${y}`, kind: "node", node: "ore", x: x * TILE + 16, y: y * TILE + 16, level: 1 });
  }
  for (let y = 12; y < h - 12; y += 27) for (let x = 14; x < w - 14; x += 25) {
    spawns.push({ id: `shroom-${x}-${y}`, kind: "node", node: "shroom", x: x * TILE + 16, y: y * TILE + 16, level: 1 });
  }
  for (let y = 8; y < h - 8; y += 18) for (let x = 8; x < w - 8; x += 21) {
    spawns.push({ id: `tree-${x}-${y}`, kind: "node", node: "tree", x: x * TILE + 16, y: y * TILE + 16, level: 1 });
  }
  return { w, h, tiles, spawns, cache: null };
}

export function paintWorld(world: WorldData): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = world.w * TILE; c.height = world.h * TILE;
  return c;
}

export function drawWorldSlice(ctx: CanvasRenderingContext2D, world: WorldData, cx: number, cy: number, vw: number, vh: number, zoom: number) {}

export function idx(x: number, y: number, w = WORLD_W): number { return y * w + x; }

export const TAVERNS: { id: string; name: string; biome: BiomeId; tx: number; ty: number; boardTx: number; boardTy: number }[] = [];

export const WORLD_RETURN: Record<string, { x: number; y: number }> = {};
