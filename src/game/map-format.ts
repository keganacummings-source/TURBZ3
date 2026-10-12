import type { Spawn, Tile as WorldTile, WorldData } from "./world";
import { TILE, WORLD_H, WORLD_W } from "./content";
import { findAtlasTile } from "./tile-atlas";

export const MAP_VERSION = 1;

export type MapTile = WorldTile & {
  sprite?: string;
};

export type MapTeleporter = {
  id: string;
  tx: number;
  ty: number;
  /** Shared link number — portals with the same number connect across maps. */
  link: number;
  label?: string;
  targetMap?: string;
};

export type MapSpawner = {
  id: string;
  tx: number;
  ty: number;
  species?: string;
  level: number;
  interval?: number;
  maxAlive?: number;
  boss?: boolean;
};

export type MapFile = {
  version: number;
  id: string;
  name: string;
  w: number;
  h: number;
  tileSize: number;
  tiles: MapTile[];
  spawns?: Spawn[];
  spawn?: { tx: number; ty: number };
  teleporters?: MapTeleporter[];
  spawners?: MapSpawner[];
  notes?: string;
};

export const FLOOR_COLOR: Record<number, string> = {
  0: "#3d5a3a",
  1: "#2a2220",
  2: "#2a5a7a",
  3: "#6a5a48",
  4: "#8a7048",
  5: "#c8d8e8",
  6: "#5a4038",
  7: "#2a1840",
  8: "#b8a890",
  9: "#6a6870",
  10: "#c8b070",
  11: "#c04018",
};

export function emptyMap(id: string, name: string, w: number, h: number, floor = 0, biome = 3): MapFile {
  const tiles: MapTile[] = Array.from({ length: w * h }, () => ({
    floor,
    biome,
    block: 0,
    decor: 0,
  }));
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const t = tiles[y * w + x]!;
      t.block = 1;
      t.floor = 1;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const t = tiles[y * w + x]!;
      t.block = 1;
      t.floor = 1;
    }
  }
  return {
    version: MAP_VERSION,
    id,
    name,
    w,
    h,
    tileSize: TILE,
    tiles,
    spawns: [],
    spawn: { tx: Math.floor(w / 2), ty: Math.floor(h / 2) },
    teleporters: [],
    spawners: [],
  };
}

export function mapToWorld(map: MapFile): WorldData {
  return {
    w: map.w,
    h: map.h,
    tiles: map.tiles.map((t) => ({
      floor: t.floor,
      biome: t.biome,
      block: t.block,
      decor: t.decor,
      sprite: t.sprite,
    })) as WorldTile[],
    spawns: map.spawns ? map.spawns.map((s) => ({ ...s })) : [],
    cache: null,
  };
}

export function tileSlow(world: WorldData, x: number, y: number): number {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return 1;
  const t = world.tiles[ty * world.w + tx] as MapTile | undefined;
  if (!t) return 1;
  if (t.sprite) {
    const a = findAtlasTile(t.sprite);
    if (a) return a.slow;
  }
  if (t.floor === 2) return 0.45;
  if (t.floor === 5) return 0.85;
  if (t.floor === 6) return 0.9;
  if (t.floor === 10) return 0.8;
  if (t.floor === 3) return 1.1;
  return 1;
}

export function parseMapJson(raw: unknown): MapFile {
  if (!raw || typeof raw !== "object") throw new Error("Map file is empty or invalid");
  const m = raw as Record<string, unknown>;
  const w = Number(m.w) | 0;
  const h = Number(m.h) | 0;
  if (w < 4 || h < 4 || w > 512 || h > 512) throw new Error("Map size out of range");
  const tilesIn = m.tiles;
  if (!Array.isArray(tilesIn) || tilesIn.length !== w * h) throw new Error("tiles array size mismatch");
  const tiles: MapTile[] = tilesIn.map((t) => {
    const o = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
    return {
      floor: Number(o.floor) | 0,
      biome: Number(o.biome) | 0,
      block: Number(o.block) | 0,
      decor: Number(o.decor) | 0,
      sprite: typeof o.sprite === "string" ? o.sprite : undefined,
    };
  });
  const spawnRaw = m.spawn && typeof m.spawn === "object" ? (m.spawn as Record<string, unknown>) : null;
  return {
    version: Number(m.version) || MAP_VERSION,
    id: String(m.id || "map"),
    name: String(m.name || "Untitled"),
    w,
    h,
    tileSize: Number(m.tileSize) || TILE,
    tiles,
    spawns: Array.isArray(m.spawns) ? (m.spawns as import("./world").Spawn[]) : [],
    teleporters: Array.isArray(m.teleporters) ? (m.teleporters as import("./map-format").MapTeleporter[]) : [],
    spawners: Array.isArray(m.spawners) ? (m.spawners as import("./map-format").MapSpawner[]) : [],
    spawn: spawnRaw
      ? { tx: Number(spawnRaw.tx) | 0, ty: Number(spawnRaw.ty) | 0 }
      : { tx: Math.floor(w / 2), ty: Math.floor(h / 2) },
    notes: typeof m.notes === "string" ? m.notes : undefined,
  };
}

export function downloadMapFile(map: MapFile) {
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${map.id || "map"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
