import type { ActorDraw } from "./sprites-body";
export * from "./sprites-body";
export type { ActorDraw, Pal } from "./sprites-body";
import { drawActorProcedural } from "./sprites-body";
import { drawCharacterSprite, ensureCharacterPack, shouldUseCharacterSprite } from "./character-sprite";

/** Player uses CharacterPack when available; NPCs stay procedural. */
export function drawActor(ctx: CanvasRenderingContext2D, a: ActorDraw): void {
  ensureCharacterPack();
  if (shouldUseCharacterSprite(a)) {
    const ok = drawCharacterSprite(ctx, a, {
      moving: a.moving,
      running: a.running,
      airborne: a.airborne,
      gear: a.packGear,
    });
    if (ok) return;
  }
  drawActorProcedural(ctx, a);
}
