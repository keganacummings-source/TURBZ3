import type { ActorDraw } from "./sprites-body";
export * from "./sprites-body";
export type { ActorDraw, Pal } from "./sprites-body";
import { drawActorProcedural } from "./sprites-body";
import { drawV2Character, ensureV2Character, shouldUseV2Character } from "./character-v2";
import { drawCharacterSprite, ensureCharacterPack, shouldUseCharacterSprite } from "./character-sprite";
import type { Gear } from "./content";

/** Prefer V2 witch paperdoll; fall back to CharacterPack; then procedural. */
export function drawActor(ctx: CanvasRenderingContext2D, a: ActorDraw): void {
  ensureV2Character();
  if (shouldUseV2Character(a)) {
    if (drawV2Character(ctx, a)) return;
  }
  ensureCharacterPack();
  if (shouldUseCharacterSprite(a)) {
    let gear = a.packGear as Gear[] | undefined;
    if (!gear?.length && a.pieces?.some((p) => (p as { packPath?: string }).packPath)) {
      gear = a.pieces
        .filter((p) => (p as { packPath?: string }).packPath)
        .map(
          (p) =>
            ({
              uid: `vis-${p.slot}`,
              slot: p.slot as Gear["slot"],
              setId: null,
              style: p.style,
              name: p.slot,
              level: 1,
              quality: "common",
              type: p.type,
              enchants: [],
              fxSeed: p.fxSeed,
              price: 0,
              moves: [],
              packPath: (p as { packPath?: string }).packPath,
              packKind: (p as { packKind?: string }).packKind,
              packSlot: (p as { packSlot?: string }).packSlot ?? p.slot,
            }) as Gear,
        );
    }
    if (drawCharacterSprite(ctx, a, { moving: a.moving, running: a.running, airborne: a.airborne, gear })) {
      return;
    }
  }
  drawActorProcedural(ctx, a);
}
