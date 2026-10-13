// actor-sprites.ts
// ---------------------------------------------------------------------------
// Sprite-based replacement for the procedural actor renderer in sprites.ts.
//
// Usage:
//   await initActorSprites(actorAtlasSpec);   // once, at startup (fire & forget)
//
// Then `drawActor()` in sprites.ts routes here automatically when the atlas is
// loaded AND a body sprite exists for the actor. If the atlas isn't ready yet
// or the actor has no body sprite, it returns false and drawActor falls back
// to the existing procedural painter — so the game never shows a blank actor
// during load or for unmapped actors (NPCs/monsters you haven't sprited yet).
//
// Key scheme (must match sprite-atlas.config.ts):
//   body   -> `body:{race}:{f|m}:{skin}`        e.g. "body:vesper:f:0"
//   piece  -> `{slot}:{style}:{type}`           e.g. "chest:3:fire"
//            with a fallback chain: type-specific -> style-only -> slot-only
//            so a partially-filled atlas still renders (missing piece => skip).
// ---------------------------------------------------------------------------

import type { ActorDraw } from "./sprites";
import { drawSetAura } from "./sprites";
import type { TypeId, Slot } from "./content";
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

// Per-slot draw offset (destination px, in the actor's local space where the
// feet sit at the actor's x/y) and anchor. The sheet's art alignment is not
// known from here, so these are the main knobs to tune once the atlas is laid
// out. Values mirror the procedural constants (NECK=-64, ARM_Y=-50) as a
// starting point.
type SlotCfg = {
  dx: number;
  dy: number;
  anchor: "bottom-center" | "center";
  scale?: number;
};
const SLOT_CFG: Record<Slot, SlotCfg> = {
  legs: { dx: 0, dy: 0, anchor: "bottom-center" },
  feet: { dx: 0, dy: 0, anchor: "bottom-center" },
  chest: { dx: 0, dy: -30, anchor: "bottom-center" },
  relic: { dx: 0, dy: -30, anchor: "bottom-center" },
  head: { dx: 0, dy: -64, anchor: "bottom-center" },
  weapon: { dx: 6, dy: -50, anchor: "center" },
};

// Composite order, back to front. The body sprite is the base; outfit pieces
// overlay on top. Weapon is drawn last so it reads in front of the body.
const PIECE_ORDER: Slot[] = ["legs", "feet", "chest", "relic", "head", "weapon"];

function bodyKey(a: ActorDraw): string {
  return `body:${a.race}:${a.female ? "f" : "m"}:${a.skin}`;
}

function pieceKeys(slot: string, style: number, type: TypeId): string[] {
  return [`${slot}:${style}:${type}`, `${slot}:${style}`, `${slot}`];
}

export function tryDrawActorSprite(
  ctx: CanvasRenderingContext2D,
  a: ActorDraw,
): boolean {
  if (!atlas) return false;
  const bk = bodyKey(a);
  if (!getRect(atlas, bk)) return false; // no body sprite -> procedural fallback

  const s = (a.scale ?? 1) * (a.tall ?? 1);
  const fxT = a.time ?? a.walk;

  // Set aura (enchantment glow) is kept unchanged — it's a spell effect, not
  // an outfit, and it's drawn in world space around the actor.
  if (a.setOn && a.setFx) drawSetAura(ctx, a.x, a.y, a.setFx, fxT, s);

  ctx.save();
  ctx.translate(a.x, a.y);
  const bob = Math.sin(a.walk * 8) * (a.walk > 0.2 ? 1.2 : 0.25);
  ctx.translate(0, bob);
  if (a.attack > 0) ctx.translate(4 * a.attack, 0);

  const flip = a.facing < 0;
  // 8-frame walk cycle; ignored when the body sprite has only 1 frame.
  const frame = Math.floor(a.walk * 8) & 7;

  // Body base (race + sex + skin).
  drawAtlasSprite(ctx, atlas, bk, {
    dx: 0,
    dy: 0,
    scale: s,
    flipX: flip,
    anchor: "bottom-center",
    frame,
  });

  // Outfit pieces, each via its fallback chain.
  for (const slot of PIECE_ORDER) {
    const piece = a.pieces.find((p) => p.slot === slot);
    if (!piece) continue;
    const cfg = SLOT_CFG[slot];
    for (const key of pieceKeys(slot, piece.style, piece.type)) {
      if (
        drawAtlasSprite(ctx, atlas, key, {
          dx: cfg.dx,
          dy: cfg.dy,
          scale: cfg.scale ?? s,
          flipX: flip,
          anchor: cfg.anchor,
          frame,
        })
      )
        break;
    }
  }

  // Hurt flash — white overlay across the body footprint.
  if (a.hurt > 0) {
    const r = getRect(atlas, bk);
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
