/**
 * Female Human main-character pack (DCSS-derived static 32×32 sprites).
 * Loaded from /CharacterPack/catalog.json — items become gear / shop / loot.
 */

import { nextUid, gearPrice, type Gear, type QualityId, type Slot, type TypeId } from "./content";
import { weaponKindFromName } from "./weapon-kind";

export type PackGrip = {
  hx: number;
  hy: number;
  restAngle: number;
  swing: number;
  scale: number;
};

export type PackItem = {
  id: string;
  file: string;
  path: string;
  slot: string;
  kind: string;
  name: string;
  folder: string;
};

export type PackCatalog = {
  version: number;
  root: string;
  base: { body: string; statue: string };
  grip: Record<string, PackGrip>;
  items: PackItem[];
  visuals: PackItem[];
  counts: Record<string, number>;
};

const imgCache = new Map<string, HTMLImageElement>();
let catalog: PackCatalog | null = null;
let loadPromise: Promise<PackCatalog | null> | null = null;

export function loadCharacterPack(): Promise<PackCatalog | null> {
  if (catalog) return Promise.resolve(catalog);
  if (loadPromise) return loadPromise;
  loadPromise = fetch("/CharacterPack/catalog.json", { cache: "force-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      catalog = j as PackCatalog | null;
      if (catalog?.base?.body) charImage(catalog.base.body);
      return catalog;
    })
    .catch(() => null);
  return loadPromise;
}

export function getCharacterPack(): PackCatalog | null {
  return catalog;
}

export function charImage(path: string): HTMLImageElement {
  let img = imgCache.get(path);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = path;
    imgCache.set(path, img);
  }
  return img;
}

export function packReady(): boolean {
  if (!catalog) return false;
  const img = imgCache.get(catalog.base.body);
  return !!(img && img.complete && img.naturalWidth > 0);
}

export function itemsBySlot(slot: string): PackItem[] {
  return catalog?.items.filter((i) => i.slot === slot) ?? [];
}

export function findPackItem(idOrPath: string): PackItem | null {
  if (!catalog) return null;
  for (const i of catalog.items) {
    if (i.id === idOrPath || i.path === idOrPath || i.file === idOrPath) return i;
  }
  return null;
}

export function gripFor(kind: string): PackGrip {
  const g = catalog?.grip?.[kind] ?? catalog?.grip?.blade;
  return g ?? { hx: 10, hy: -2, restAngle: -0.85, swing: 1.4, scale: 1 };
}

export function packSlotToGear(slot: string): Slot | null {
  switch (slot) {
    case "weapon":
      return "weapon";
    case "head":
      return "head";
    case "chest":
      return "chest";
    case "feet":
      return "feet";
    case "hands":
    case "shield":
    case "back":
    case "relic":
    case "ring":
      return "relic";
    default:
      return null;
  }
}

function typeFromName(name: string): TypeId {
  const n = name.toLowerCase();
  if (/fire|flame|lava|dragon.*red|red_dragon/.test(n)) return "fire";
  if (/ice|frost|cold/.test(n)) return "ice";
  if (/storm|lightning|electric|thunder/.test(n)) return "electric";
  if (/void|shadow|dark|demon/.test(n)) return "void";
  if (/holy|light|solar|angel/.test(n)) return "light";
  if (/poison|venom|nature|thorn|leaf/.test(n)) return "earth";
  if (/water|tide|ocean|pearl/.test(n)) return "water";
  if (/spirit|ghost|soul/.test(n)) return "spirit";
  if (/air|wind|feather/.test(n)) return "air";
  return "normal";
}

export function gearFromPackItem(
  item: PackItem,
  level = 1,
  quality: QualityId = "common",
): Gear | null {
  const slot = packSlotToGear(item.slot);
  if (!slot) return null;
  const type = typeFromName(item.name);
  const style = hashStyle(item.id);
  const gear: Gear = {
    uid: nextUid(),
    slot,
    setId: null,
    style,
    name: item.name,
    level: Math.max(1, level),
    quality,
    type,
    enchants: [],
    fxSeed: style * 17 + level,
    price: 0,
    moves: [],
    packId: item.id,
    packPath: item.path,
    packKind: item.kind,
    packSlot: item.slot,
    weaponKind: slot === "weapon" || item.slot === "shield" ? weaponKindFromName(item.kind || item.name) : undefined,
  } as Gear;
  gear.price = gearPrice(gear);
  return gear;
}

function hashStyle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 48;
}

export function rollPackGear(
  rng: () => number,
  level: number,
  prefer?: "weapon" | "armor" | "any",
): Gear | null {
  if (!catalog) return null;
  let pool = catalog.items.filter((i) => packSlotToGear(i.slot));
  if (prefer === "weapon") pool = pool.filter((i) => i.slot === "weapon" || i.slot === "shield");
  if (prefer === "armor") pool = pool.filter((i) => ["head", "chest", "feet", "hands", "back"].includes(i.slot));
  const newer = pool.filter((i) => /_new\.png$/i.test(i.file) || !/_old\.png$/i.test(i.file));
  if (newer.length > pool.length * 0.3) pool = newer;
  if (!pool.length) return null;
  const item = pool[Math.floor(rng() * pool.length)]!;
  const qRoll = rng();
  const quality: QualityId =
    qRoll > 0.97 ? "legendary" : qRoll > 0.9 ? "epic" : qRoll > 0.75 ? "rare" : qRoll > 0.45 ? "fine" : "common";
  return gearFromPackItem(item, level, quality);
}

export type PackGearFields = {
  packId?: string;
  packPath?: string;
  packKind?: string;
  packSlot?: string;
};

export function asPackGear(g: Gear): (Gear & PackGearFields) | null {
  const x = g as Gear & PackGearFields;
  return x.packPath ? x : null;
}
