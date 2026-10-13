/**
 * Animated draw of the female Human main character using CharacterPack
 * static 32×32 sprites + procedural motion (walk / run / jump / attack).
 *
 * Scale notes:
 * - Source art is 32×32 (DCSS-style). Armor overlays share the same frame origin.
 * - BASE_SCALE controls on-screen size. Layer offsets are in *source pixels* and
 *   are multiplied by the same pixel scale so sets stay registered when upscaled.
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

/** On-screen scale multiplier for the 32×32 pack (was ~2.15 — far too small). */
const BASE_SCALE = 4.6;
/** Source-pixel → screen-pixel factor applied to both size and offsets. */
const PX = 0.55;

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

function resolveVisualGear(
  a: ActorDraw,
  optsGear?: Gear[],
): Array<{ slot: string; packPath: string; packKind: string; packSlot: string }> {
  const out: Array<{ slot: string; packPath: string; packKind: string; packSlot: string }> = [];
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
      const path = (p as { packPath?: string }).packPath!;
      const kind = (p as { packKind?: string }).packKind ?? p.slot;
      const ps = (p as { packSlot?: string }).packSlot ?? p.slot;
      push(p.slot, path, kind, ps);
    }
  }

  const seed = pieceStyleSeed(a);
  if (!out.some((x) => x.packSlot === "chest" || x.slot === "chest")) {
    const it = pickItem("chest", seed + 1);
    if (it) push("chest", it.path, it.kind, "chest");
  }
  if (!out.some((x) => x.packSlot === "head" || x.slot === "head")) {
    const it = pickItem("head", seed + 2);
    if (it) push("head", it.path, it.kind, "head");
  }
  if (!out.some((x) => x.packSlot === "feet" || x.slot === "feet")) {
    const it = pickItem("feet", seed + 3);
    if (it) push("feet", it.path, it.kind, "feet");
  }
  if (!out.some((x) => x.packSlot === "weapon" || x.slot === "weapon")) {
    const it = pickItem("weapon", seed + 4);
    if (it) push("weapon", it.path, it.kind, "weapon");
  }
  if (!out.some((x) => x.packSlot === "shield") && seed % 5 === 0) {
    const it = pickItem("shield", seed + 5);
    if (it) push("relic", it.path, it.kind, "shield");
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

  const body = charImage(pack.base.body);
  if (!body.complete && body.naturalWidth <= 0) {
    ensureCharacterPack();
    if (!packReady() && body.naturalWidth <= 0) return false;
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
    bob = Math.sin(t * 10) * 2.2;
    lean = Math.sin(t * 10) * 0.035;
  } else if (anim.state === "run") {
    bob = Math.sin(t * 16) * 3.2;
    lean = 0.1 + Math.sin(t * 16) * 0.05;
  } else if (anim.state === "jump") {
    bob = -anim.jumpY - 8;
    stretchY = 0.9;
    stretchX = 1.08;
  } else if (anim.state === "attack") {
    bob = Math.sin(anim.attackT * Math.PI) * -1.6;
  } else {
    bob = Math.sin(t * 2.2) * 0.7;
  }

  const sc = (a.scale ?? 1) * BASE_SCALE;
  const unit = sc * PX; // 1 source pixel → screen pixels

  // Foot-anchored: a.x/a.y is ground contact under the feet
  ctx.save();
  ctx.translate(a.x, a.y + bob);
  ctx.scale(face * stretchX, stretchY);
  ctx.rotate(lean * face);

  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 11 * unit * 0.7, 3.4 * unit * 0.35, 0, 0, Math.PI * 2);
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

  // DCSS 32×32 frames share origin — draw all layers at the same anchor.
  const ANCHOR_Y = -16;

  if (back?.packPath) drawLayer(ctx, back.packPath, 0, ANCHOR_Y, unit, 0);
  if (shield) drawHeld(ctx, shield.packPath, shield.packKind || "shield", anim, unit, -1);

  drawLayer(ctx, pack.base.body, 0, ANCHOR_Y, unit, 0);

  if (feet?.packPath) drawLayer(ctx, feet.packPath, 0, ANCHOR_Y, unit, 0);
  if (chest?.packPath) drawLayer(ctx, chest.packPath, 0, ANCHOR_Y, unit, 0);
  if (hands?.packPath) drawLayer(ctx, hands.packPath, 0, ANCHOR_Y, unit, 0);
  if (head?.packPath) drawLayer(ctx, head.packPath, 0, ANCHOR_Y, unit, 0);

  const hairVis = pack.visuals.find((v) => v.kind === "hair");
  if (hairVis && a.female && !head) drawLayer(ctx, hairVis.path, 0, ANCHOR_Y, unit, 0);

  if (weapon) drawHeld(ctx, weapon.packPath, weapon.packKind || "blade", anim, unit, 1);

  if (a.hurt > 0) {
    ctx.globalAlpha = a.hurt * 0.5;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-10 * unit, -28 * unit, 20 * unit, 28 * unit);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  return true;
}

/** Draw a 32×32 pack layer. ox/oy are source-pixel offsets from feet anchor. */
function drawLayer(
  ctx: CanvasRenderingContext2D,
  path: string,
  ox: number,
  oy: number,
  unit: number,
  rot: number,
): void {
  const img = charImage(path);
  if (!img.complete || img.naturalWidth <= 0) return;
  const w = img.naturalWidth * unit;
  const h = img.naturalHeight * unit;
  ctx.save();
  ctx.translate(ox * unit, oy * unit);
  ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawHeld(
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
  let angle = grip.restAngle * side;
  if (anim.state === "attack" && side > 0) {
    const swing = Math.sin(anim.attackT * Math.PI) * grip.swing;
    angle = grip.restAngle + swing;
  } else if (anim.state === "walk" || anim.state === "run") {
    const speed = anim.state === "run" ? 16 : 10;
    angle = grip.restAngle * side + Math.sin(anim.time * speed) * 0.1 * side;
  } else if (anim.state === "jump") {
    angle = grip.restAngle * side - 0.2 * side;
  }

  const w = img.naturalWidth * unit * grip.scale;
  const h = img.naturalHeight * unit * grip.scale;

  const hx = (side > 0 ? 10 : -9) + (grip.hx - 10) * 0.35 * side;
  const hy = -12 + grip.hy * 0.25;

  ctx.save();
  ctx.translate(hx * unit, hy * unit);
  ctx.rotate(angle);
  ctx.drawImage(img, -w * 0.35, -h * 0.7, w, h);
  ctx.restore();
}

export function shouldUseCharacterSprite(a: ActorDraw & { usePack?: boolean }): boolean {
  if (a.ghost) return false;
  return a.female !== false && a.usePack !== false;
}
