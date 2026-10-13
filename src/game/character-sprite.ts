/**
 * Female Human player doll using CharacterPack (DCSS-style 32×32).
 *
 * Composition rules (matches how these tiles were drawn):
 * - Chest armor tiles are FULL-BODY frames — they replace the nude base.
 * - Head / feet / hands / back composite on top when present.
 * - Weapon & shield use grip offsets on the sides.
 * - All layers share the same 32×32 origin; scale is uniform (no squish).
 */

import type { ActorDraw } from "./sprites";
import {
  asPackGear,
  charImage,
  getCharacterPack,
  gripFor,
  loadCharacterPack,
  packReady,
  type PackItem,
} from "./character-pack";
import type { Gear } from "./content";

export type AnimState = "idle" | "walk" | "run" | "jump" | "attack";

export type CharAnim = {
  state: AnimState;
  attackT: number;
  jumpY: number;
  time: number;
};

/** On-screen size of the 32×32 doll (source px → screen px). */
const UNIT = 3.2; // ~102px tall character
const BASE_SCALE = 1;

export function animFromActor(a: ActorDraw, moving: boolean, running: boolean, airborne: boolean): CharAnim {
  const t = a.time ?? 0;
  let state: AnimState = "idle";
  if (a.attack > 0.08) state = "attack";
  else if (airborne) state = "jump";
  else if (running && moving) state = "run";
  else if (moving || a.walk > 0.05) state = "walk";
  return {
    state,
    attackT: Math.max(0, Math.min(1, a.attack)),
    jumpY: airborne ? 10 : 0,
    time: t,
  };
}

export function ensureCharacterPack(): void {
  void loadCharacterPack();
}

function liveEquippedPackGear(): Gear[] {
  try {
    const g = (window as unknown as { __turbz?: { piece?: (s: string) => Gear | null } }).__turbz;
    if (!g?.piece) return [];
    return (["weapon", "head", "chest", "legs", "feet", "relic"] as const)
      .map((s) => g.piece!(s))
      .filter((x): x is Gear => !!x && !!(x as Gear & { packPath?: string }).packPath);
  } catch {
    return [];
  }
}

function pieceStyleSeed(a: ActorDraw): number {
  const p = a.pieces?.[0];
  return (p?.style ?? 0) + (p?.fxSeed ?? 0) * 7 + (a.skin ?? 0) * 13;
}

function pickItem(slot: string, seed: number): PackItem | null {
  const pack = getCharacterPack();
  if (!pack) return null;
  const pool = pack.items.filter((i) => i.slot === slot);
  if (!pool.length) return null;
  return pool[Math.abs(seed) % pool.length]!;
}

type Vis = { slot: string; packPath: string; packKind: string; packSlot: string };

function resolveVisualGear(a: ActorDraw, optsGear?: Gear[]): Vis[] {
  const out: Vis[] = [];
  const seen = new Set<string>();

  const push = (slot: string, path: string, kind: string, packSlot: string) => {
    const key = packSlot || slot;
    if (!path || seen.has(key)) return;
    seen.add(key);
    out.push({ slot, packPath: path, packKind: kind, packSlot: packSlot || slot });
  };

  const list = [
    ...(optsGear ?? []),
    ...((a as ActorDraw & { packGear?: Gear[] }).packGear ?? []),
    ...liveEquippedPackGear(),
  ];
  for (const g of list) {
    const pg = asPackGear(g);
    if (pg?.packPath) {
      push(g.slot, pg.packPath, pg.packKind ?? "blade", pg.packSlot ?? g.slot);
    }
  }

  for (const p of a.pieces ?? []) {
    if ((p as { packPath?: string }).packPath) {
      push(
        p.slot,
        (p as { packPath: string }).packPath,
        (p as { packKind?: string }).packKind ?? p.slot,
        (p as { packSlot?: string }).packSlot ?? p.slot,
      );
    }
  }

  const seed = pieceStyleSeed(a);
  if (!out.some((x) => x.packSlot === "chest" || x.slot === "chest")) {
    const it = pickItem("chest", seed + 1);
    if (it) push("chest", it.path, it.kind, "chest");
  }
  if (!out.some((x) => x.packSlot === "weapon" || x.slot === "weapon")) {
    const it = pickItem("weapon", seed + 4);
    if (it) push("weapon", it.path, it.kind, "weapon");
  }

  return out;
}

export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  a: ActorDraw,
  opts?: {
    moving?: boolean;
    running?: boolean;
    airborne?: boolean;
    gear?: Gear[];
  },
): boolean {
  const pack = getCharacterPack();
  if (!pack) {
    ensureCharacterPack();
    return false;
  }

  const bodyImg = charImage(pack.base.body);
  if (!bodyImg.complete && bodyImg.naturalWidth <= 0) {
    ensureCharacterPack();
    if (!packReady() && bodyImg.naturalWidth <= 0) return false;
  }

  const moving = opts?.moving ?? a.walk > 0.08;
  const running = opts?.running ?? false;
  const airborne = opts?.airborne ?? false;
  const anim = animFromActor(a, moving, running, airborne);
  const t = anim.time;
  const face = a.facing < 0 ? -1 : 1;

  let bob = 0;
  let lean = 0;
  let stretchY = 1;
  let stretchX = 1;
  if (anim.state === "walk") {
    bob = Math.sin(t * 10) * 2.4;
    lean = Math.sin(t * 10) * 0.03;
  } else if (anim.state === "run") {
    bob = Math.sin(t * 16) * 3.4;
    lean = 0.09 + Math.sin(t * 16) * 0.04;
  } else if (anim.state === "jump") {
    bob = -anim.jumpY - 8;
    stretchY = 0.9;
    stretchX = 1.08;
  } else if (anim.state === "attack") {
    bob = Math.sin(anim.attackT * Math.PI) * -1.8;
  } else {
    bob = Math.sin(t * 2.2) * 0.8;
  }

  const unit = UNIT * (a.scale ?? 1) * BASE_SCALE;

  ctx.save();
  ctx.translate(a.x, a.y + bob);
  ctx.scale(face * stretchX, stretchY);
  ctx.rotate(lean * face);

  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 14 * unit * 0.45, 4 * unit * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.imageSmoothingEnabled = false;

  const visuals = resolveVisualGear(a, opts?.gear);
  const shield = visuals.find((g) => g.packSlot === "shield");
  const weapon = visuals.find((g) => g.packSlot === "weapon" || g.slot === "weapon");
  const chest = visuals.find((g) => g.packSlot === "chest" || g.slot === "chest");
  const head = visuals.find((g) => g.packSlot === "head" || g.slot === "head");
  const feet = visuals.find((g) => g.packSlot === "feet" || g.slot === "feet");
  const hands = visuals.find((g) => g.packSlot === "hands");
  const back = visuals.find((g) => g.packSlot === "back");

  const ax = 0;
  const ay = -16;

  if (back?.packPath) blit(ctx, back.packPath, ax, ay, unit);
  if (shield) hold(ctx, shield.packPath, shield.packKind || "shield", anim, unit, -1);

  // BODY — chest armor replaces nude base (tiles are full-body)
  if (chest?.packPath) {
    blit(ctx, chest.packPath, ax, ay, unit);
  } else {
    blit(ctx, pack.base.body, ax, ay, unit);
  }

  if (feet?.packPath) blit(ctx, feet.packPath, ax, ay, unit);
  if (hands?.packPath) blit(ctx, hands.packPath, ax, ay, unit);
  if (head?.packPath) blit(ctx, head.packPath, ax, ay, unit);
  else {
    const hairVis = pack.visuals.find((v) => v.kind === "hair");
    if (hairVis && a.female) blit(ctx, hairVis.path, ax, ay, unit);
  }

  if (weapon) hold(ctx, weapon.packPath, weapon.packKind || "blade", anim, unit, 1);

  if (a.hurt > 0) {
    ctx.globalAlpha = a.hurt * 0.45;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-12 * unit, -28 * unit, 24 * unit, 28 * unit);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  return true;
}

function blit(
  ctx: CanvasRenderingContext2D,
  path: string,
  ox: number,
  oy: number,
  unit: number,
): void {
  const img = charImage(path);
  if (!img.complete || img.naturalWidth <= 0) return;
  const w = img.naturalWidth * unit;
  const h = img.naturalHeight * unit;
  ctx.drawImage(img, ox * unit - w / 2, oy * unit - h / 2, w, h);
}

function hold(
  ctx: CanvasRenderingContext2D,
  path: string,
  kind: string,
  anim: CharAnim,
  unit: number,
  side: number,
): void {
  const img = charImage(path);
  if (!img.complete || img.naturalWidth <= 0) return;
  const grip = gripFor(kind);

  // Full-frame weapon/shield art composites at doll origin when not attacking
  if (img.naturalWidth >= 32 && anim.state !== "attack") {
    blit(ctx, path, 0, -16, unit);
    return;
  }

  let angle = grip.restAngle * (side > 0 ? 1 : 0.6);
  if (anim.state === "attack" && side > 0) {
    angle = grip.restAngle + Math.sin(anim.attackT * Math.PI) * grip.swing;
  } else if (anim.state === "walk" || anim.state === "run") {
    const speed = anim.state === "run" ? 16 : 10;
    angle += Math.sin(anim.time * speed) * 0.08 * side;
  }

  const w = img.naturalWidth * unit * grip.scale;
  const h = img.naturalHeight * unit * grip.scale;
  const hx = side > 0 ? 9 : -8;
  const hy = -11;

  ctx.save();
  ctx.translate(hx * unit, hy * unit);
  ctx.rotate(angle * side);
  ctx.drawImage(img, -w * 0.35, -h * 0.7, w, h);
  ctx.restore();
}

export function shouldUseCharacterSprite(a: ActorDraw & { usePack?: boolean }): boolean {
  if (a.ghost) return false;
  return a.female !== false && a.usePack !== false;
}
