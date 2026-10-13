// actor-sprites.ts
// Full-body class sprites (armor system removed). Falls back to procedural if no class sprite.

import type { ActorDraw } from "./sprites";
import { drawSetAura } from "./sprites";
import type { TypeId } from "./content";
import {
  loadAtlas,
  drawAtlasSprite,
  getRect,
  type Atlas,
  type AtlasSpec,
} from "./sprite-atlas";

let atlas: Atlas | null = null;
let ready = false;

export async function initActorSprites(spec: AtlasSpec): Promise<Atlas> {
  atlas = await loadAtlas(spec);
  ready = true;
  return atlas;
}

export function actorSpritesReady(): boolean {
  return ready;
}

function classKeyFromActor(a: ActorDraw): string | null {
  // Prefer explicit class if present on the draw payload (future), else map race for legacy
  const anyA = a as any;
  if (anyA.classId) return `class:${anyA.classId}`;
  // temporary mapping from old race
  const raceMap: Record<string, string> = {
    vesper: "voidwalker",
    cinder: "pyromancer",
    tide: "tidecaller",
    thorn: "briarmage",
    rime: "frostblade",
  };
  const mapped = raceMap[a.race];
  return mapped ? `class:${mapped}` : null;
}

export function tryDrawActorSprite(
  ctx: CanvasRenderingContext2D,
  a: ActorDraw,
): boolean {
  if (!atlas) return false;
  const ck = classKeyFromActor(a);
  if (!ck || !getRect(atlas, ck)) return false;

  const s = (a.scale ?? 1) * (a.tall ?? 1);
  const fxT = a.time ?? a.walk;

  if (a.setOn && a.setFx) drawSetAura(ctx, a.x, a.y, a.setFx, fxT, s);

  ctx.save();
  ctx.translate(a.x, a.y);
  const bob = Math.sin(a.walk * 8) * (a.walk > 0.2 ? 1.2 : 0.25);
  ctx.translate(0, bob);
  if (a.attack > 0) ctx.translate(4 * a.attack, 0);

  const flip = a.facing < 0;
  const frame = Math.floor(a.walk * 8) & 7;

  drawAtlasSprite(ctx, atlas, ck, {
    dx: 0,
    dy: 0,
    scale: s,
    flipX: flip,
    anchor: "bottom-center",
    frame,
  });

  if (a.hurt > 0) {
    const r = getRect(atlas, ck);
    if (r) {
      ctx.globalAlpha = a.hurt * 0.55;
      ctx.fillStyle = "#fff";
      ctx.fillRect((-r.w / 2) * s, -r.h * s, r.w * s, r.h * s);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
  return true;
}
