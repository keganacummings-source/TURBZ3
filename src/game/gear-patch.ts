/**
 * Gear overhaul runtime patch:
 * - CharacterPack drops preferred over old racial sets
 * - Type rolls on first pickup (armor 1 type, weapons up to 4)
 * - Hold right-click to shield (blocks attacks)
 */
import { rollGear, mulberry32, type Gear } from "./content";
import { awakenGearType } from "./gear-types";
import { rollPackGear } from "./character-pack";

export function applyGearPatch(game: any): void {
  if (!game || game.__gearPatched) return;
  game.__gearPatched = true;
  game.shielding = false;

  const origReceive = game.receiveGear?.bind(game);
  if (origReceive) {
    game.receiveGear = function receiveGear(g: Gear) {
      if (g && ((g as any).typeless || (g as any).type === "typeless")) {
        awakenGearType(g, Math.random);
        const types = (g as any).types?.length ? (g as any).types.join("/") : String(g.type);
        this.say?.(`Awakened ${g.name} · ${types}.`);
      }
      return origReceive(g);
    };
  }

  const origKill = game.killMob?.bind(game);
  if (origKill) {
    game.killMob = function killMob(mob: any) {
      const save = this.save;
      const before = save?.gear?.length ?? 0;
      origKill(mob);
      // Prefer CharacterPack gear on boss kills if nothing dropped
      if (save && (save.gear?.length ?? 0) === before && mob?.boss) {
        const piece = rollPackGear(Math.random, Math.max(1, mob.level ?? 1), Math.random() < 0.5 ? "weapon" : "armor");
        if (piece) this.receiveGear?.(piece);
      }
    };
  }

  // Also bias shop/stock rolls when shop is filled — wrap rollGear callers indirectly via receiveGear only

  const canvas = game.canvas as HTMLCanvasElement | undefined;
  if (canvas && !canvas.dataset.gearShield) {
    canvas.dataset.gearShield = "1";
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button === 2) {
          game.shielding = true;
          game.wardT = Math.max(game.wardT ?? 0, 0.25);
          game.shield = Math.max(game.shield ?? 0, 10);
          game.say?.("Shield raised. Hold right-click to block — you cannot attack.");
        }
      },
      true,
    );
    canvas.addEventListener(
      "pointerup",
      (e) => {
        if (e.button === 2) game.shielding = false;
      },
      true,
    );
    window.addEventListener("blur", () => {
      game.shielding = false;
    });
  }

  const origCast = game.castMove?.bind(game);
  if (origCast) {
    game.castMove = function castMove(move: any, prefer?: any) {
      if (this.shielding) {
        this.say?.("Lower your shield to attack.");
        return false;
      }
      return origCast(move, prefer);
    };
  }

  const dmgFn = ["applyPlayerDamage", "hurtPlayer", "takeDamage"].find((n) => typeof game[n] === "function");
  if (dmgFn) {
    const orig = game[dmgFn].bind(game);
    game[dmgFn] = function (amount: number, ...rest: any[]) {
      let dmg = amount;
      if (this.shielding) {
        dmg = Math.floor(dmg * 0.35);
        const save = this.save;
        if (save) this.float?.(save.x, save.y - 28, "BLOCK", "#9ad0ff");
      }
      return orig(dmg, ...rest);
    };
  }
}

export function rollLootGear(level: number, prefer?: "weapon" | "armor" | "any"): Gear {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  return (
    rollPackGear(rng, level, prefer === "any" ? undefined : prefer) ??
    rollGear(rng, { level, luck: 20, floor: level > 20 ? "rare" : "fine" })
  );
}
