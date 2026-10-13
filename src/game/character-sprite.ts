/**
 * Player doll — V2-style composition adapted for CharacterPack (32×32 DCSS tiles).
 *
 * From V2 (engine/character.lua + armor_v2 guide):
 * - Source frames are 32px (V2 bakes 96→32). Scale snaps to whole pixels.
 * - Every layer shares the same origin and scale (no per-slot drift).
 * - Layer order: back → body/chest → feet → hands → hair → head → held.
 * - Chest armor in this pack is a full-body frame and replaces the nude base.
 * - Weapons/shields are inventory tiles drawn in-hand at reduced scale.
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

/** Match V2: FRAME is the logical sprite size before scale. */
const FRAME = 32;
/**
 * World draw scale relative to FRAME (V2 often uses ~2–3 on the 320 board).
 * dest = max(FRAME, floor(FRAME * WORLD_SCALE)) → ~80px tall.
 */
const WORLD_SCALE = 2.5;

/** V2 drawScale: snap to whole pixels so layers stay registered. */
function drawScale(scale: number): number {
  const s = scale || 1;
  const dest = Math.max(FRAME, Math.floor(FRAME * s + 0.5));
  return dest / FRAME;
}

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
    jumpY: airborne ? 8 : 0,
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

  for (const g of [
    ...(optsGear ?? []),
    ...((a as ActorDraw & { packGear?: Gear[] }).packGear ?? []),
    ...liveEquippedPackGear(),
  ]) {
    const pg = asPackGear(g);
    if (pg?.packPath) push(g.slot, pg.packPath, pg.packKind ?? "blade", pg.packSlot ?? g.slot);
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
  opts?: { moving?: boolean; running?: boolean; airborne?: boolean; gear?: Gear[] },
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
  if (anim.state === "walk") {
    bob = Math.sin(t * 10) * 1.5;
    lean = Math.sin(t * 10) * 0.03;
  } else if (anim.state === "run") {
    bob = Math.sin(t * 16) * 2.4;
    lean = 0.08 + Math.sin(t * 16) * 0.04;
  } else if (anim.state === "jump") {
    bob = -anim.jumpY - 6;
  } else if (anim.state === "attack") {
    bob = Math.sin(anim.attackT * Math.PI) * -1.2;
  } else {
    bob = Math.sin(t * 2.2) * 0.5;
  }

  const scale = drawScale(WORLD_SCALE * (a.scale ?? 1));
  const px = -(FRAME / 2) * scale;
  const py = -(FRAME - 0.5) * scale;

  ctx.save();
  ctx.translate(a.x, a.y + bob);
  ctx.scale(face, 1);
  ctx.rotate(lean * face);
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 10 * scale * 0.45, 3 * scale * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  const visuals = resolveVisualGear(a, opts?.gear);
  const shield = visuals.find((g) => g.packSlot === "shield");
  const weapon = visuals.find((g) => g.packSlot === "weapon" || g.slot === "weapon");
  const chest = visuals.find((g) => g.packSlot === "chest" || g.slot === "chest");
  const head = visuals.find((g) => g.packSlot === "head" || g.slot === "head");
  const feet = visuals.find((g) => g.packSlot === "feet" || g.slot === "feet");
  const hands = visuals.find((g) => g.packSlot === "hands");
  const back = visuals.find((g) => g.packSlot === "back");

  const blit = (path: string) => {
    const img = charImage(path);
    if (!img.complete || img.naturalWidth <= 0) return;
    ctx.drawImage(img, px, py, FRAME * scale, FRAME * scale);
  };

  if (back?.packPath) blit(back.packPath);
  if (chest?.packPath) blit(chest.packPath);
  else blit(pack.base.body);
  if (feet?.packPath) blit(feet.packPath);
  if (hands?.packPath) blit(hands.packPath);
  if (head?.packPath) blit(head.packPath);
  else {
    const hairVis = pack.visuals.find((v) => v.kind === "hair");
    if (hairVis && a.female) blit(hairVis.path);
  }

  if (shield) hold(ctx, shield.packPath, shield.packKind || "shield", anim, scale, -1);
  if (weapon) hold(ctx, weapon.packPath, weapon.packKind || "blade", anim, scale, 1);

  if (a.hurt > 0) {
    ctx.globalAlpha = a.hurt * 0.45;
    ctx.fillStyle = "#fff";
    ctx.fillRect(px, py, FRAME * scale, FRAME * scale);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  return true;
}

function hold(
  ctx: CanvasRenderingContext2D,
  path: string,
  kind: string,
  anim: CharAnim,
  scale: number,
  side: number,
): void {
  const img = charImage(path);
  if (!img.complete || img.naturalWidth <= 0) return;
  const grip = gripFor(kind);

  let angle = side > 0 ? -0.9 : 0.35;
  if (anim.state === "attack" && side > 0) {
    angle = -0.9 + Math.sin(anim.attackT * Math.PI) * 1.35;
  } else if (anim.state === "walk" || anim.state === "run") {
    const speed = anim.state === "run" ? 16 : 10;
    angle += Math.sin(anim.time * speed) * 0.1 * side;
  }

  const handScale = 0.5 * (grip.scale || 1) * scale;
  const w = img.naturalWidth * handScale;
  const h = img.naturalHeight * handScale;
  const hx = (side > 0 ? 10 : -9) * scale;
  const hy = -10 * scale;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.drawImage(img, -w * 0.3, -h * 0.75, w, h);
  ctx.restore();
}

export function shouldUseCharacterSprite(a: ActorDraw & { usePack?: boolean }): boolean {
  if (a.ghost) return false;
  return a.female !== false && a.usePack !== false;
}
