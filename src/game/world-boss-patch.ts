/**
 * World bosses fight inside FleshDen (public/Maps/worldbossarea1.json).
 * - Overworld boss markers / rifts open the den.
 * - Boss spawns at map center.
 * - On kill, a return portal opens to the overworld entry point.
 */
import { POIS, TILE, scaleTile, type TypeId } from "./content";
import { loadNamedMap } from "./map-loader";
import { fetchMapFile } from "./map-format";

const BOSS_MAP_ID = "worldbossarea1";

type ReturnSpot = { x: number; y: number; bossId: string };

export function applyWorldBossPatch(game: any): void {
  if (!game || game.__wbPatched) return;
  game.__wbPatched = true;
  game.bossReturn = null as ReturnSpot | null;
  game.bossExitPortal = null as { x: number; y: number } | null;
  game.activeBossId = null as string | null;

  const origDescribe = game.describeAt?.bind(game);
  if (origDescribe) {
    game.describeAt = function describeAt(x: number, y: number) {
      const info = origDescribe(x, y);
      if (info && info.title && Array.isArray(info.actions) && info.lines?.some?.((l: string) => /World boss/i.test(l))) {
        const poi = POIS.find((p) => p.kind === "boss" && p.name === info.title);
        if (poi && poi.kind === "boss") {
          info.actions = [{ id: `boss:${poi.id}`, label: "Enter FleshDen" }];
          info.hint = `${poi.name} — flesh-rift`;
        }
      }
      return info;
    };
  }

  const origMenuAct = game.menuAct?.bind(game);
  game.menuAct = function menuAct(id: string) {
    if (typeof id === "string" && id.startsWith("boss:")) {
      void enterBossDen(this, id.slice(5));
      return;
    }
    if (id === "boss_exit") {
      leaveBossDen(this);
      return;
    }
    return origMenuAct?.(id);
  };

  const origOpenInspect = game.openInspect?.bind(game);
  game.openInspect = function openInspect(x: number, y: number, sx: number, sy: number) {
    if (this.save?.map === BOSS_MAP_ID && this.bossExitPortal) {
      const d = const d = Math.hypot(x - this.bossExitPortal.x, y - this.bossExitPortal.y);
      if (d < 48) {
        leaveBossDen(this);
        return;
      }
    }
    return origOpenInspect?.(x, y, sx, sy);
  };

  const origTick = game.tick?.bind(game);
  if (origTick) {
    game.tick = function tick(dt: number) {
      origTick(dt);
      const save = this.save;
      if (!save || this.dead) return;
      if (save.map === "world") {
        for (const p of POIS) {
          if (p.kind !== "boss") continue;
          const at = scaleBossPoi(p.tx, p.ty);
          const d = Math.hypot(save.x - at.x, save.y - at.y);
          if (d < 36) {
            void enterBossDen(this, p.id);
            break;
          }
        }
      }
      if (save.map === BOSS_MAP_ID && this.bossExitPortal) {
        const d = Math.hypot(save.x - this.bossExitPortal.x, save.y - this.bossExitPortal.y);
        if (d < 40) leaveBossDen(this);
      }
    };
  }

  const origKill = game.killMob?.bind(game);
  if (origKill) {
    game.killMob = function killMob(mob: any) {
      const wasBoss = !!mob?.boss;
      const map = this.save?.map;
      origKill(mob);
      if (wasBoss && map === BOSS_MAP_ID) {
        const w = this.world;
        const cx = ((w?.w ?? 12) / 2) * TILE;
        const cy = ((w?.h ?? 9) / 2) * TILE;
        this.bossExitPortal = { x: cx, y: cy };
        this.say?.("The world boss falls. A tear opens at the heart of the den — step through to return.");
        this.float?.(cx, cy - 24, "EXIT", "#b4a6ff");
        this.syncHud?.(true);
      }
    };
  }
}

function scaleBossPoi(tx: number, ty: number): { x: number; y: number } {
  const at = scaleTile(tx, ty);
  return { x: at.tx * TILE + 16, y: at.ty * TILE + 16 };
}

async function enterBossDen(game: any, bossId: string): Promise<void> {
  const save = game.save;
  if (!save || save.map === BOSS_MAP_ID) return;
  const poi = POIS.find((p) => p.kind === "boss" && p.id === bossId);
  if (!poi || poi.kind !== "boss") {
    game.say?.("No boss marked.");
    return;
  }

  game.bossReturn = { x: save.x, y: save.y, bossId };
  game.bossExitPortal = null;
  game.activeBossId = bossId;
  game.say?.(`A flesh-rift tears open. ${poi.name} waits in the den.`);

  const file = await fetchMapFile(BOSS_MAP_ID);
  const world = await loadNamedMap(BOSS_MAP_ID, save.seed ?? 42);
  game.world = world;
  if (game.world) game.world.cache = null;
  save.map = BOSS_MAP_ID;

  const spawnTx = file?.spawn?.tx ?? Math.floor((world.w || 24) / 2);
  const spawnTy = file?.spawn?.ty ?? Math.floor((world.h || 18) / 2);
  save.x = spawnTx * TILE + 16;
  save.y = spawnTy * TILE + 16;
  if (game.cam) {
    game.cam.x = save.x;
    game.cam.y = save.y;
  }

  const cx = Math.floor((world.w || 24) / 2);
  const cy = Math.floor((world.h || 18) / 2);
  const bossX = cx * TILE + 16;
  const bossY = cy * TILE + 16;

  const mob = game.makeMob?.({
    id: `wb-${bossId}`,
    kind: "mob",
    species: "saintling",
    boss: true,
    bossId: poi.id,
    name: poi.name,
    x: bossX,
    y: bossY,
    level: poi.level,
    template: poi.template,
    type: poi.type as TypeId,
  });
  game.mobs = mob ? [mob] : [];
  game.dest = null;
  game.duel = null;
  game.syncHud?.(true);
  game.persist?.();
}

function leaveBossDen(game: any): void {
  const save = game.save;
  if (!save || save.map !== BOSS_MAP_ID) return;
  const ret = game.bossReturn as ReturnSpot | null;
  game.bossExitPortal = null;
  game.activeBossId = null;
  const x = ret?.x ?? save.x;
  const y = ret?.y ?? save.y;
  game.bossReturn = null;
  if (typeof game.switchTo === "function") {
    game.switchTo("world", { x, y });
  } else {
    save.map = "world";
    game.loadMap?.("world", true);
    save.x = x;
    save.y = y;
  }
  game.say?.("You step back into the overworld.");
  game.syncHud?.(true);
  game.persist?.();
}
