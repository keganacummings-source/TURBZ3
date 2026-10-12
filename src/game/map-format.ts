import type { Spawn, Tile as WorldTile, WorldData } from "./world";
import { TILE, WORLD_H, WORLD_W } from "./content";
import { findAtlasTile } from "./tile-atlas";

export const MAP_VERSION = 1;

export type MapTile = WorldTile & {
  sprite?: string;
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
  if (!raw || typeof raw !== "object") throw new Error("Map file is empty or invalid.");
  const m = raw as Partial<MapFile>;
  if (typeof m.w !== "number" || typeof m.h !== "number") throw new Error("Map needs w and h.");
  if (!Array.isArray(m.tiles) || m.tiles.length !== m.w * m.h) {
    throw new Error(`Map tiles length must be w*h (${m.w! * m.h!}), got ${m.tiles?.length ?? 0}.`);
  }
  return {
    version: m.version ?? MAP_VERSION,
    id: m.id ?? "custom",
    name: m.name ?? "Custom Map",
    w: m.w,
    h: m.h,
    tileSize: m.tileSize ?? TILE,
    tiles: m.tiles.map((t) => ({
      floor: Number(t.floor) || 0,
      biome: Number(t.biome) || 0,
      block: Number(t.block) || 0,
      decor: Number(t.decor) || 0,
      sprite: typeof t.sprite === "string" ? t.sprite : undefined,
    })),
    spawns: Array.isArray(m.spawns) ? (m.spawns as Spawn[]) : [],
    spawn: m.spawn,
    notes: m.notes,
  };
}

export function downloadMapFile(map: MapFile): void {
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${map.id || "map"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fetchMapFile(id: string): Promise<MapFile | null> {
  try {
    const res = await fetch(`/Maps/${id}.json`, { cache: "no-cache" });
    if (!res.ok) return null;
    return parseMapJson(await res.json());
  } catch {
    return null;
  }
}

export { TILE, WORLD_W, WORLD_H };
