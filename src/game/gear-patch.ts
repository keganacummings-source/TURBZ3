/**
 * Gear overhaul: CharacterPack gear, type-on-pickup, RMB shield, visual outfit.
 */
import { rollGear, mulberry32, type Gear } from "./content";
import { awakenGearType } from "./gear-types";
import {
  loadCharacterPack,
  rollPackGear,
  getCharacterPack,
  gearFromPackItem,
} from "./character-pack";

function outfitSaveWithPack(game: any, save: any): void {
  if (!save) return;
  const pack = getCharacterPack();
  if (!pack) return;

  const rng = mulberry32((((save.seed ?? 1) * 997) + ((save.level ?? 1) * 13)) >>> 0);
  const lvl = Math.max(1, save.level ?? 1);
  const equipped = save.equipped ?? (save.equipped = {});
  const gear: Gear[] = Array.isArray(save.gear) ? save.gear : (save.gear = []);

  const hasPack = (slot: string) => {
    const uid = equipped[slot];
    if (!uid) return false;
    const g = gear.find((x: any) => x.uid === uid);
    return !!(g && (g as any).packPath);
  };

  // One visual set index so V2 paperdoll layers match
  const setStyle = Math.floor(rng() * 20);

  const addFromSlot = (packSlot: string, gearSlot: string, forceStyle?: number) => {
    if (hasPack(gearSlot)) return;
    const pool = pack.items.filter((i) => i.slot === packSlot);
    if (!pool.length) return;
    const item = pool[Math.floor(rng() * pool.length)]!;
    const qRoll = rng();
    const quality =
      qRoll > 0.97 ? "legendary" : qRoll > 0.9 ? "epic" : qRoll > 0.75 ? "rare" : qRoll > 0.45 ? "fine" : "common";
    const piece = gearFromPackItem(item, lvl, quality as any);
    if (!piece) return;
    (piece as any).slot = gearSlot;
    (piece as any).typeless = true;
    if (forceStyle !== undefined) (piece as any).style = forceStyle;
    gear.push(piece);
    equipped[gearSlot] = piece.uid;
  };

  addFromSlot("weapon", "weapon");
  addFromSlot("chest", "chest", setStyle);
  addFromSlot("head", "head", setStyle);
  addFromSlot("feet", "feet", setStyle);
  addFromSlot("shield", "relic");
}

export function applyGearPatch(game: any): void {
  if (!game || game.__gearPatched) return;
  game.__gearPatched = true;
  game.shielding = false;

  void loadCharacterPack().then(() => {
    if (game.save) {
      outfitSaveWithPack(game, game.save);
      game.syncHud?.(true);
    }
  });

  const origReceive = game.receiveGear?.bind(game);
  if (origReceive) {
    game.receiveGear = function receiveGear(g: Gear) {
      if (g && !(g as any).packPath && g.slot !== "weapon" && Math.random() < 0.9) {
        const packPiece = rollPackGear(Math.random, g.level || 1, "armor");
        if (packPiece) {
          packPiece.level = g.level;
          packPiece.quality = g.quality;
          g = packPiece;
        }
      }
      if (g && ((g as any).typeless || (g as any).type === "typeless")) {
        awakenGearType(g, Math.random);
        const types = (g as any).types?.length ? (g as any).types.join("/") : String(g.type);
        this.say?.(`Awakened ${g.name} · ${types}.`);
      }
      return origReceive(g);
    };
  }

  for (const fnName of ["begin", "continueGame", "wearSet"] as const) {
    const orig = game[fnName]?.bind(game);
    if (!orig) continue;
    game[fnName] = function (...args: any[]) {
      const ret = orig(...args);
      void loadCharacterPack().then(() => {
        outfitSaveWithPack(this, this.save);
        this.syncHud?.(true);
        this.persist?.();
      });
      return ret;
    };
  }

  const origKill = game.killMob?.bind(game);
  if (origKill) {
    game.killMob = function killMob(mob: any) {
      const save = this.save;
      const before = save?.gear?.length ?? 0;
      origKill(mob);
      const after = save?.gear?.length ?? 0;
      if (save) {
        const lvl = Math.max(1, mob?.level ?? 1);
        if (after === before) {
          if (Math.random() < (mob?.boss ? 1 : 0.28)) {
            const piece = rollPackGear(Math.random, lvl, Math.random() < 0.4 ? "weapon" : "armor");
            if (piece) this.receiveGear?.(piece);
          }
        } else if (mob?.boss) {
          const piece = rollPackGear(Math.random, lvl + 2, Math.random() < 0.5 ? "weapon" : "armor");
          if (piece) this.receiveGear?.(piece);
        }
      }
    };
  }

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
