/**
 * V2 witch paperdoll — mirrors engine/character.lua:
 * body → hair → optional gown → armor (one matching set).
 */
import type { ActorDraw } from "./sprites";

const FRAME = 32;
const BLOCK = 128;
const WORLD_SCALE = 2.5;

const WITCH_URL = "/V2Char/witch_sm.png";
const ARMOR_URL = "/V2Char/armor_sm.png";

const SKIN_COUNT = 12;
const HAIR_COUNT = 20;
const OUTFIT_COUNT = 60;

let witchImg: HTMLImageElement | null = null;
let armorImg: HTMLImageElement | null = null;
let loading = false;

function loadSheets(): void {
  if (loading || (witchImg?.complete && armorImg?.complete)) return;
  loading = true;
  if (!witchImg) {
    witchImg = new Image();
    witchImg.src = WITCH_URL;
  }
  if (!armorImg) {
    armorImg = new Image();
    armorImg.src = ARMOR_URL;
  }
}

function ready(): boolean {
  loadSheets();
  return !!(
    witchImg &&
    armorImg &&
    witchImg.complete &&
    armorImg.complete &&
    witchImg.naturalWidth > 0 &&
    armorImg.naturalWidth > 0
  );
}

function drawScale(scale: number): number {
  const dest = Math.max(FRAME, Math.floor(FRAME * (scale || 1) + 0.5));
  return dest / FRAME;
}

function dirFromFacing(facing: number): number {
  return facing < 0 ? 1 : 2;
}

function walkFrame(walk: number): number {
  if (walk < 0.05) return 0;
  return Math.floor(walk * 2) % 4;
}

function outfitOrigin(outfit: number): [number, number] {
  const s = ((outfit % OUTFIT_COUNT) + OUTFIT_COUNT) % OUTFIT_COUNT;
  const cell = s * 4;
  const col = cell % 20;
  const row = 2 + Math.floor(cell / 20);
  return [col * BLOCK, row * BLOCK];
}

function armorOrigin(setNumber: number, slotIndex: number): [number, number] {
  const n = ((setNumber || 1) - 1) % 20;
  const row = Math.floor(n / 4);
  const col = (n % 4) * 5 + (slotIndex || 0);
  return [col * BLOCK, row * BLOCK];
}

/** BACK HEAD CHEST LEGS FEET inside a set block */
const SLOT_INDEX: Record<string, number> = {
  back: 0,
  accessory: 0,
  head: 1,
  chest: 2,
  legs: 3,
  feet: 4,
};

function blitFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  ox: number,
  oy: number,
  direction: number,
  frame: number,
  px: number,
  py: number,
  scale: number,
): void {
  const sx = ox + frame * FRAME;
  const sy = oy + direction * FRAME;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, FRAME, FRAME, px, py, FRAME * scale, FRAME * scale);
}

function hashSeed(a: ActorDraw): number {
  return ((a.skin ?? 0) * 17 + (a.hair ?? 0) * 31 + (a.pieces?.[0]?.style ?? 0) * 13) >>> 0;
}

export function drawV2Character(ctx: CanvasRenderingContext2D, a: ActorDraw): boolean {
  if (!ready()) {
    loadSheets();
    return false;
  }
  if (!witchImg || !armorImg) return false;

  const scale = drawScale(WORLD_SCALE * (a.scale ?? 1));
  const direction = dirFromFacing(a.facing);
  const frame = walkFrame(a.walk ?? 0);
  const seed = hashSeed(a);

  const skin = ((a.skin ?? seed) % SKIN_COUNT + SKIN_COUNT) % SKIN_COUNT;
  const hair = ((a.hair ?? seed * 3) % HAIR_COUNT + HAIR_COUNT) % HAIR_COUNT;
  const outfit = ((seed * 7) % OUTFIT_COUNT + OUTFIT_COUNT) % OUTFIT_COUNT;

  const armorPieces = (a.pieces ?? []).filter((p) =>
    ["head", "chest", "legs", "feet", "back"].includes(p.slot),
  );

  const chest = armorPieces.find((p) => p.slot === "chest");
  const helm = armorPieces.some((p) => p.slot === "head");

  // Always one matching set (from chest, else first piece)
  const setNum = chest
    ? (chest.style % 20) + 1
    : armorPieces[0]
      ? (armorPieces[0].style % 20) + 1
      : 1;

  const px = Math.floor(-(FRAME / 2) * scale);
  const py = Math.floor(-(FRAME - 0.5) * scale);

  let bob = 0;
  if (a.attack > 0.08) bob = Math.sin(a.attack * Math.PI) * -1.2;
  else if ((a.walk ?? 0) > 0.05) bob = Math.sin((a.time ?? 0) * 10) * 1.2;

  ctx.save();
  ctx.translate(a.x, a.y + bob);
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 9 * scale * 0.42, 2.6 * scale * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  blitFrame(ctx, witchImg, skin * BLOCK, 0, direction, frame, px, py, scale);

  if (!helm) {
    blitFrame(ctx, witchImg, hair * BLOCK, BLOCK, direction, frame, px, py, scale);
  }

  // Soft gown only when no chest plate
  if (!chest) {
    const [ox, oy] = outfitOrigin(outfit);
    blitFrame(ctx, witchImg, ox, oy, direction, frame, px, py, scale);
  }

  const rank: Record<string, number> = { back: 0, feet: 1, legs: 2, chest: 3, head: 4 };
  const ordered = [...armorPieces].sort((x, y) => (rank[x.slot] ?? 9) - (rank[y.slot] ?? 9));
  for (const p of ordered) {
    const idx = SLOT_INDEX[p.slot];
    if (idx === undefined) continue;
    const [ax, ay] = armorOrigin(setNum, idx);
    blitFrame(ctx, armorImg, ax, ay, direction, frame, px, py, scale);
  }

  if (a.hurt > 0) {
    ctx.globalAlpha = a.hurt * 0.4;
    ctx.fillStyle = "#fff";
    ctx.fillRect(px, py, FRAME * scale, FRAME * scale);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  return true;
}

export function ensureV2Character(): void {
  loadSheets();
}

export function shouldUseV2Character(a: ActorDraw & { usePack?: boolean }): boolean {
  if (a.ghost) return false;
  return a.female !== false && a.usePack !== false;
}
