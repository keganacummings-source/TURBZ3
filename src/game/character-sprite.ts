/**
 * Animated draw of the female Human main character using CharacterPack
 * static 32×32 sprites + procedural motion (walk / run / jump / attack).
 * NPCs stay on the procedural path in sprites.ts.
 */

import type { ActorDraw } from "./sprites";
import {
  asPackGear,
  charImage,
  getCharacterPack,
  gripFor,
  loadCharacterPack,
  packReady,
} from "./character-pack";
import type { Gear } from "./content";

export type AnimState = "idle" | "walk" | "run" | "jump" | "attack";

export type CharAnim = {
  state: AnimState;
  attackT: number;
  jumpY: number;
  time: number;
};

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
  if (!pack || !packReady()) {
    ensureCharacterPack();
    return false;
  }

  const body = charImage(pack.base.body);
  if (!body.complete || body.naturalWidth <= 0) return false;

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
    bob = Math.sin(t * 10) * 1.6;
    lean = Math.sin(t * 10) * 0.04;
  } else if (anim.state === "run") {
    bob = Math.sin(t * 16) * 2.4;
    lean = 0.08 + Math.sin(t * 16) * 0.05;
  } else if (anim.state === "jump") {
    bob = -anim.jumpY - 6;
    stretchY = 0.92;
    stretchX = 1.06;
  } else if (anim.state === "attack") {
    bob = Math.sin(anim.attackT * Math.PI) * -1.2;
  } else {
    bob = Math.sin(t * 2.2) * 0.5;
  }

  const scale = (a.scale ?? 1) * 2.15;
  const sc = scale;

  ctx.save();
  ctx.translate(a.x, a.y + bob);
  ctx.scale(face * stretchX, stretchY);
  ctx.rotate(lean * face);

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 10 * sc * 0.35, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.imageSmoothingEnabled = false;

  const gearList = opts?.gear ?? (a as ActorDraw & { packGear?: Gear[] }).packGear ?? [];
  const packPieces = gearList.map((g) => asPackGear(g)).filter(Boolean) as NonNullable<
    ReturnType<typeof asPackGear>
  >[];

  const shield = packPieces.find((g) => g.packSlot === "shield");
  const weapon = packPieces.find((g) => g.packSlot === "weapon" || g.slot === "weapon");
  const chest = packPieces.find((g) => g.packSlot === "chest" || g.slot === "chest");
  const head = packPieces.find((g) => g.packSlot === "head" || g.slot === "head");
  const feet = packPieces.find((g) => g.packSlot === "feet" || g.slot === "feet");
  const hands = packPieces.find((g) => g.packSlot === "hands");
  const back = packPieces.find((g) => g.packSlot === "back");

  if (back?.packPath) drawLayer(ctx, back.packPath, 0, -14, sc, 0);
  if (shield) drawHeld(ctx, shield.packPath!, shield.packKind ?? "shield", anim, sc);

  drawLayer(ctx, pack.base.body, 0, -16, sc, 0);

  if (feet?.packPath) drawLayer(ctx, feet.packPath, 0, -8, sc * 0.95, 0);
  if (chest?.packPath) drawLayer(ctx, chest.packPath, 0, -16, sc, 0);
  if (hands?.packPath) drawLayer(ctx, hands.packPath, 0, -14, sc * 0.9, 0);
  if (head?.packPath) drawLayer(ctx, head.packPath, 0, -22, sc, 0);

  const hairVis = pack.visuals.find((v) => v.kind === "hair");
  if (hairVis && a.female && !head) drawLayer(ctx, hairVis.path, 0, -22, sc, 0);

  if (weapon) drawHeld(ctx, weapon.packPath!, weapon.packKind ?? "blade", anim, sc);

  if (a.hurt > 0) {
    ctx.globalAlpha = a.hurt * 0.5;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-10 * sc * 0.5, -28 * sc * 0.5, 10 * sc, 28 * sc * 0.5);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  return true;
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  path: string,
  ox: number,
  oy: number,
  sc: number,
  rot: number,
): void {
  const img = charImage(path);
  if (!img.complete || img.naturalWidth <= 0) return;
  const w = img.naturalWidth * sc * 0.5;
  const h = img.naturalHeight * sc * 0.5;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawHeld(
  ctx: CanvasRenderingContext2D,
  path: string,
  kind: string,
  anim: CharAnim,
  sc: number,
): void {
  const img = charImage(path);
  if (!img.complete || img.naturalWidth <= 0) return;
  const grip = gripFor(kind);
  let angle = grip.restAngle;
  if (anim.state === "attack") {
    const swing = Math.sin(anim.attackT * Math.PI) * grip.swing;
    angle = grip.restAngle + swing;
  } else if (anim.state === "walk" || anim.state === "run") {
    const speed = anim.state === "run" ? 16 : 10;
    angle = grip.restAngle + Math.sin(anim.time * speed) * 0.12;
  } else if (anim.state === "jump") {
    angle = grip.restAngle - 0.25;
  }

  const w = img.naturalWidth * sc * 0.5 * grip.scale;
  const h = img.naturalHeight * sc * 0.5 * grip.scale;
  ctx.save();
  ctx.translate(grip.hx * sc * 0.35, grip.hy * sc * 0.35 - 12);
  ctx.rotate(angle);
  ctx.drawImage(img, -w * 0.35, -h * 0.75, w, h);
  ctx.restore();
}

export function shouldUseCharacterSprite(a: ActorDraw & { usePack?: boolean }): boolean {
  if (a.ghost) return false;
  // Female player body uses CharacterPack whenever sprites.ts routes through drawCharacterSprite.
  return a.female !== false && a.usePack !== false;
}
