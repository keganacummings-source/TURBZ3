import { buildWorld, type WorldData } from "./world";
import { fetchMapFile, mapToWorld, emptyMap, type MapFile, type MapTile } from "./map-format";
import { loadTileCatalog } from "./tile-atlas";

let cachedMain: WorldData | null = null;
let cachedMainFile: MapFile | null = null;
let loadPromise: Promise<WorldData> | null = null;

export async function loadMainWorld(seed = 42): Promise<WorldData> {
  void loadTileCatalog();
  if (cachedMain) return cachedMain;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const file = await fetchMapFile("main");
    if (file) {
      cachedMainFile = file;
      cachedMain = mapToWorld(file);
      return cachedMain;
    }
    cachedMain = buildWorld(seed);
    return cachedMain;
  })();
  return loadPromise;
}

export function getMainWorldSync(seed = 42): WorldData {
  if (cachedMain) return cachedMain;
  return buildWorld(seed);
}

export function getMainMapFile(): MapFile | null {
  return cachedMainFile;
}

export async function loadNamedMap(id: string, seed = 42): Promise<WorldData> {
  if (id === "main" || id === "world") return loadMainWorld(seed);
  try {
    const file = await fetchMapFile(id);
    if (file) return mapToWorld(file);
  } catch {
    /* incomplete JSON — fall through */
  }
  if (id === "worldbossarea1" || id === "FleshDen") {
    return mapToWorld(generateFleshDen());
  }
  if (id === "crypt" || id === "kiln") {
    const { buildDungeon } = await import("./world");
    return buildDungeon(id as "crypt" | "kiln", seed);
  }
  return buildWorld(seed);
}

/** Built-in FleshDen so boss fights work even if the JSON map is incomplete. */
function generateFleshDen(): MapFile {
  const w = 24;
  const h = 18;
  const map = emptyMap("worldbossarea1", "FleshDen", w, h, 0, 3);
  const wall = "/MapAssets/02_Walls_and_Cliffs/wall_flesh_0.png";
  const floor = "/MapAssets/01_Floor_and_Ground_Tiles/pebble_brown_7_old.png";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = map.tiles[y * w + x]! as MapTile;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      t.block = edge ? 1 : 0;
      t.floor = edge ? 1 : 0;
      t.biome = 3;
      t.sprite = edge ? wall : floor;
    }
  }
  map.spawn = { tx: 4, ty: 13 };
  return map;
}

export function clearMapCache(): void {
  cachedMain = null;
  cachedMainFile = null;
  loadPromise = null;
}
