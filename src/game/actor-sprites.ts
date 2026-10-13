// actor-sprites.ts
// Draws actors from the Antifarea charset sheets. Falls back to the procedural
// actor in sprites.ts for the first frames, while the sheets are still loading.

import type { ActorDraw } from "./sprites";
import { drawSetAura } from "./sprites";
import { loadAtlas, drawAtlasSprite, type Atlas } from "./sprite-atlas";
import {
  ACTOR_ATLASES,
  ACTOR_SPRITE_SCALE,
  ACTOR_WALK_FRAMES,
  CLASS_SLOTS,
  NPC_BAND,
  NPC_SHEET,
  NPC_SLOTS_BY_ID,
  RACE_SLOTS,
  ROW_DOWN,
  resolveSlot,
  spriteKey,
  type SheetId,
  type SpriteSlot,
} from "./actor-sheets.config";

let atlases: Partial<Record<SheetId, Atlas>> = {};
let ready = false;

export async function initActorSprites(): Promise<void> {
  const loaded = await Promise.all(
    ACTOR_ATLASES.map(async ({ id, spec }) => [id, await loadAtlas(spec)] as const),
  );
  const next: Partial<Record<SheetId, Atlas>> = {};
  for (const [id, atlas] of loaded) next[id] = atlas;
  atlases = next;
  ready = true;
}

export function actorSpritesReady(): boolean {
  return ready;
}

type ActorExtras = { classId?: string; npcId?: string };

function resolveActorSlot(a: ActorDraw): SpriteSlot | null {
  const extra = a as ActorDraw & ActorExtras;
  const npcIndex = extra.npcId ? NPC_SLOTS_BY_ID[extra.npcId] : undefined;
  if (npcIndex != null) {
    return { sheet: NPC_SHEET, band: NPC_BAND, index: npcIndex };
  }
  const classSlot = extra.classId ? CLASS_SLOTS[extra.classId] : undefined;
  if (classSlot) return resolveSlot(classSlot, a.female);
  const raceSlot = RACE_SLOTS[a.race];
  return raceSlot ? resolveSlot(raceSlot, a.female) : null;
}

export function tryDrawActorSprite(ctx: CanvasRenderingContext2D, a: ActorDraw): boolean {
  if (!ready) return false;
  const slot = resolveActorSlot(a);
  if (!slot) return false;
  const atlas = atlases[slot.sheet];
  if (!atlas) return false;

  const s = (a.scale ?? 1) * (a.tall ?? 1) * ACTOR_SPRITE_SCALE;
  const fxT = a.time ?? a.walk;

  if (a.setOn && a.setFx) drawSetAura(ctx, a.x, a.y, a.setFx, fxT, s / ACTOR_SPRITE_SCALE);

  const step = Math.floor(a.walk * 6) % ACTOR_WALK_FRAMES;
  const key = spriteKey(slot, ROW_DOWN, Math.abs(step));

  ctx.save();
  ctx.translate(a.x, a.y);
  const bob = Math.sin(a.walk * 8) * (a.walk > 0.2 ? 1.2 : 0.25);
  ctx.translate(0, bob);
  if (a.attack > 0) ctx.translate(4 * a.attack, 0);

  const drawn = drawAtlasSprite(ctx, atlas, key, {
    dx: 0,
    dy: 0,
    scale: s,
    flipX: a.facing < 0,
    anchor: "bottom-center",
  });

  if (!drawn) {
    ctx.restore();
    return false;
  }

  if (a.hurt > 0) {
    ctx.globalAlpha = a.hurt * 0.55;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-8 * s, -18 * s, 16 * s, 18 * s);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  return true;
}