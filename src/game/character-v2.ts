/**
 * V2 witch paperdoll — same rules as engine/character.lua:
 * 32px frames, integer scale, shared origin, body → hair → outfit → armor.
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

/** direction: 0 down, 1 left, 2 right, 3 up */
function dirFromFacing(facing: number): number {
  return facing < 0 ? 1 : 2;
}

function walkFrame(walk: number): number {
  if (walk < 0.05) return 0;
  return Math.floor(walk * 2) % 4;
}

function outfitOrigin(outfit: number): [number, number] {
  const s = outfit % OUTFIT_COUNT;
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

  const skin = (a.skin ?? seed) % SKIN_COUNT;
  const hair = (a.hair ?? seed * 3) % HAIR_COUNT;
  const outfit = (a.pieces?.[0]?.style ?? seed * 7) % OUTFIT_COUNT;

  const pieces: { slot: string; set: number; quality: number }[] = [];
  for (const p of a.pieces ?? []) {
    if (["head", "chest", "legs", "feet", "back", "accessory"].includes(p.slot)) {
      pieces.push({
        slot: p.slot,
        set: (p.style % 20) + 1,
        quality: p.quality ?? 0,
      });
    }
  }

  const px = Math.floor(-(FRAME / 2) * scale);
  const py = Math.floor(-(FRAME - 0.5) * scale);

  let bob = 0;
  if (a.attack > 0.08) bob = Math.sin(a.attack * Math.PI) * -1.2;
  else if ((a.walk ?? 0) > 0.05) bob = Math.sin((a.time ?? 0) * 10) * 1.2;

  ctx.save();
  ctx.translate(a.x, a.y + bob);
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 9 * scale * 0.45, 2.8 * scale * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  blitFrame(ctx, witchImg, (skin % SKIN_COUNT) * BLOCK, 0, direction, frame, px, py, scale);

  const helm = pieces.some((p) => p.slot === "head");
  if (!helm) {
    blitFrame(ctx, witchImg, (hair % HAIR_COUNT) * BLOCK, BLOCK, direction, frame, px, py, scale);
  }

  const [ox, oy] = outfitOrigin(outfit);
  blitFrame(ctx, witchImg, ox, oy, direction, frame, px, py, scale);

  const rank: Record<string, number> = { feet: 1, legs: 2, chest: 3, accessory: 4, back: 4, head: 5 };
  pieces.sort((a, b) => (rank[a.slot] ?? 9) - (rank[b.slot] ?? 9));
  for (const p of pieces) {
    const idx = SLOT_INDEX[p.slot] ?? 2;
    const [ax, ay] = armorOrigin(p.set, idx);
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
