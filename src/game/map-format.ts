import type { Spawn, Tile as WorldTile, WorldData } from "./world";
import { TILE, WORLD_H, WORLD_W, MONSTER_BY_ID, ANIMAL_BY_ID, MONSTERS, mulberry32 } from "./content";
import { findAtlasTile } from "./tile-atlas";

export const MAP_VERSION = 1;

export type MapTile = WorldTile & {
  sprite?: string;
};

export type ZoneType = "enemy" | "boss" | "mixed" | "ore" | "tree" | "shroom";

/** A rectangle that fills with enemies or resource nodes when the map is played. */
export type SpawnZone = {
  id: string;
  type: ZoneType;
  tx: number;
  ty: number;
  tw: number;
  th: number;
  species?: string;
  levelMin: number;
  levelMax: number;
  count: number;
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
  zones?: SpawnZone[];
  spawn?: { tx: number; ty: number };
  notes?: string;
  kind?: "bossroom" | "dungeon" | "world";
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
    zones: [],
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
    spawns: expandMapSpawns(map),
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
  if (typeof m.id !== "string" || !/^[a-z0-9_-]{1,80}$/i.test(m.id) || typeof m.name !== "string" || !m.name.trim()) throw new Error("Map needs a name and a file ID using letters, numbers, dashes or underscores.");
  if (m.version !== MAP_VERSION) throw new Error("Unsupported map version.");
  if (!Number.isInteger(m.w) || !Number.isInteger(m.h) || m.w! < 4 || m.h! < 4 || m.w! > 512 || m.h! > 512) throw new Error("Map dimensions must be whole numbers from 4 to 512.");
  if (m.tileSize !== TILE) throw new Error(`Tile size must be ${TILE}.`);
  if (!Array.isArray(m.tiles) || m.tiles.length !== m.w! * m.h!) throw new Error("Tile count must match the map dimensions.");
  const tiles = m.tiles.map((t) => {
    if (!t || !Number.isInteger(t.floor) || t.floor < 0 || t.floor > 11 || !Number.isInteger(t.biome) || t.biome < 0 || t.biome > 6 || ![0, 1].includes(t.block) || !Number.isInteger(t.decor) || t.decor < 0 || t.decor > 100) throw new Error("Invalid map tile.");
    if (t.sprite && (typeof t.sprite !== "string" || !/^\/MapAssets\/[A-Za-z0-9_/-]+\.png$/.test(t.sprite) || t.sprite.includes(".."))) throw new Error("Tile sprite must come from MapAssets.");
    return { floor: t.floor, biome: t.biome, block: t.block, decor: t.decor, ...(t.sprite ? { sprite: t.sprite } : {}) };
  });
  const spawn = m.spawn ?? { tx: 1, ty: 1 };
  if (!Number.isInteger(spawn.tx) || !Number.isInteger(spawn.ty) || spawn.tx < 0 || spawn.ty < 0 || spawn.tx >= m.w! || spawn.ty >= m.h! || tiles[spawn.ty * m.w! + spawn.tx]!.block) throw new Error("Player start must be on a walkable tile inside the map.");
  if (m.spawns !== undefined && (!Array.isArray(m.spawns) || m.spawns.length > 2000)) throw new Error("Invalid spawn list (maximum 2000).");
  const ids = new Set<string>();
  const spawns = (m.spawns ?? []).map(s => {
    if (!s || typeof s.id !== "string" || !s.id || ids.has(s.id) || !["mob", "node"].includes(s.kind) || !Number.isFinite(s.x) || !Number.isFinite(s.y) || s.x < 0 || s.y < 0 || s.x >= m.w! * TILE || s.y >= m.h! * TILE || !Number.isInteger(s.level) || s.level < 1 || s.level > 100 || tiles[Math.floor(s.y / TILE) * m.w! + Math.floor(s.x / TILE)]!.block) throw new Error("Invalid or blocked entity spawn.");
    if (s.kind === "mob" && (!s.species || !(MONSTER_BY_ID[s.species] || ANIMAL_BY_ID[s.species]))) throw new Error("Unknown enemy species.");
    if (s.kind === "node" && !["ore", "tree", "shroom", "fish"].includes(s.node ?? "")) throw new Error("Unknown resource node.");
    if (s.boss !== undefined && typeof s.boss !== "boolean") throw new Error("Invalid boss flag.");
    ids.add(s.id);
    return { ...s };
  });
  return { version: MAP_VERSION, id: typeof m.id === "string" ? m.id.slice(0, 80) : "custom", name: typeof m.name === "string" ? m.name.slice(0, 100) : "Custom Map", w: m.w!, h: m.h!, tileSize: TILE, tiles, spawns, zones: parseZones(m.zones, m.w!, m.h!, tiles), spawn, notes: typeof m.notes === "string" ? m.notes.slice(0, 2000) : undefined, kind: ["bossroom", "dungeon", "world"].includes(m.kind ?? "") ? m.kind : "world" };
}

const ZONE_TYPES: ZoneType[] = ["enemy", "boss", "mixed", "ore", "tree", "shroom"];

function parseZones(raw: unknown, w: number, h: number, tiles: MapTile[]): SpawnZone[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 200) throw new Error("Invalid zone list (maximum 200).");
  const ids = new Set<string>();
  return raw.map((z) => {
    if (!z || typeof z !== "object") throw new Error("Invalid spawn zone.");
    const zone = z as Partial<SpawnZone>;
    if (typeof zone.id !== "string" || !zone.id || ids.has(zone.id)) throw new Error("Spawn zones need unique ids.");
    if (!ZONE_TYPES.includes(zone.type as ZoneType)) throw new Error("Unknown spawn zone type.");
    if (!Number.isInteger(zone.tx) || !Number.isInteger(zone.ty) || !Number.isInteger(zone.tw) || !Number.isInteger(zone.th)) throw new Error("Spawn zone bounds must be whole tiles.");
    if (zone.tx! < 0 || zone.ty! < 0 || zone.tw! < 1 || zone.th! < 1 || zone.tx! + zone.tw! > w || zone.ty! + zone.th! > h) throw new Error("Spawn zone sits outside the map.");
    if (!Number.isInteger(zone.levelMin) || !Number.isInteger(zone.levelMax) || zone.levelMin! < 1 || zone.levelMax! > 100 || zone.levelMin! > zone.levelMax!) throw new Error("Zone levels must be whole numbers from 1 to 100.");
    if (!Number.isInteger(zone.count) || zone.count! < 1 || zone.count! > 40) throw new Error("Zone spawn count must be 1 to 40.");
    const type = zone.type as ZoneType;
    let species = typeof zone.species === "string" ? zone.species : undefined;
    if (type === "enemy" || type === "boss") {
      if (!species || !(MONSTER_BY_ID[species] || ANIMAL_BY_ID[species])) throw new Error("Unknown enemy type in a spawn zone.");
    } else species = undefined;
    const walkable = tilesInRect(w, zone.tx!, zone.ty!, zone.tw!, zone.th!).some((i) => !tiles[i]!.block);
    if (!walkable) throw new Error("Spawn zone needs at least one walkable tile.");
    ids.add(zone.id);
    return { id: zone.id.slice(0, 80), type, tx: zone.tx!, ty: zone.ty!, tw: zone.tw!, th: zone.th!, ...(species ? { species } : {}), levelMin: zone.levelMin!, levelMax: zone.levelMax!, count: zone.count! };
  });
}

function tilesInRect(w: number, tx: number, ty: number, tw: number, th: number): number[] {
  const out: number[] = [];
  for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) out.push(y * w + x);
  return out;
}

/** Turn authored spawn points and zones into the entities the world actually loads. */
export function expandMapSpawns(map: MapFile): Spawn[] {
  const spawns = (map.spawns ?? []).map((s) => ({ ...s }));
  const taken = new Set(spawns.map((s) => `${Math.floor(s.x / TILE)},${Math.floor(s.y / TILE)}`));
  for (const zone of map.zones ?? []) {
    const open = tilesInRect(map.w, zone.tx, zone.ty, zone.tw, zone.th).filter((i) => {
      const t = map.tiles[i];
      if (!t || t.block) return false;
      const x = i % map.w, y = (i / map.w) | 0;
      return !taken.has(`${x},${y}`);
    });
    const rng = mulberry32((hashStr(zone.id) ^ zone.tx * 97 ^ zone.ty * 13) >>> 0);
    for (let i = open.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const swap = open[i]!;
      open[i] = open[j]!;
      open[j] = swap;
    }
    const n = Math.min(zone.count, open.length);
    for (let i = 0; i < n; i++) {
      const idx = open[i]!;
      const x = idx % map.w, y = (idx / map.w) | 0;
      taken.add(`${x},${y}`);
      const span = zone.levelMax - zone.levelMin + 1;
      const level = zone.levelMin + Math.floor(rng() * span);
      if (zone.type === "ore" || zone.type === "tree" || zone.type === "shroom") {
        spawns.push({ id: `${zone.id}-n${i}`, kind: "node", node: zone.type, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, level: 1 });
      } else {
        const species = zone.type === "mixed" ? MONSTERS[Math.floor(rng() * MONSTERS.length)]!.id : zone.species!;
        spawns.push({ id: `${zone.id}-e${i}`, kind: "mob", species, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, level, boss: zone.type === "boss" });
      }
    }
  }
  return spawns;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
