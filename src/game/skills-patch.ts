/**
 * Ensures weapon + type mastery skills exist, grants XP when used,
 * and applies mastery bonuses to outgoing damage.
 */
import { ALL_MASTERY_SKILL_IDS, typeSkillId, weaponSkillId } from "./skills-catalog";
import { weaponKindFromName } from "./weapon-kind";
import { MOVE_BY_ID } from "./content";

function ensureAll(save: any): void {
  if (!save) return;
  save.skills = save.skills || {};
  for (const id of ALL_MASTERY_SKILL_IDS) {
    if (!save.skills[id]) save.skills[id] = { level: 1, xp: 0 };
  }
}

export function applySkillsPatch(game: any): void {
  if (!game || game.__skillsPatched) return;
  game.__skillsPatched = true;

  for (const fn of ["begin", "continueGame"] as const) {
    const orig = game[fn]?.bind(game);
    if (!orig) continue;
    game[fn] = function (...args: any[]) {
      const r = orig(...args);
      ensureAll(this.save);
      return r;
    };
  }

  const origMelee = game.autoMelee?.bind(game);
  if (origMelee) {
    game.autoMelee = function autoMelee(mob: any) {
      const weapon = this.piece?.("weapon");
      const kind =
        (weapon as any)?.weaponKind ||
        weaponKindFromName((weapon as any)?.packKind || weapon?.name || "blade");
      const wSkill = weaponSkillId(kind);
      const type = weapon?.type && weapon.type !== "typeless" ? weapon.type : "normal";
      const tSkill = typeSkillId(String(type));
      const types = (weapon as any)?.types as string[] | undefined;

      origMelee(mob);

      if (wSkill) this.gainSkill?.(wSkill, 3);
      this.gainSkill?.(tSkill, 2);
      if (types?.length) {
        for (const t of types) this.gainSkill?.(typeSkillId(t), 1);
      }
    };
  }

  const origCastMove = game.castMove?.bind(game);
  if (origCastMove) {
    game.castMove = function castMove(move: any, prefer?: any) {
      const ok = origCastMove(move, prefer);
      if (ok === false) return ok;
      const m = typeof move === "string" ? MOVE_BY_ID[move] : move;
      if (m?.type) this.gainSkill?.(typeSkillId(m.type), 3);
      const weapon = this.piece?.("weapon");
      const kind =
        (weapon as any)?.weaponKind ||
        weaponKindFromName((weapon as any)?.packKind || weapon?.name || "");
      const wSkill = weaponSkillId(kind);
      if (wSkill && m && (m.form === "melee" || m.form === "ranged" || !m.form)) {
        this.gainSkill?.(wSkill, 2);
      }
      return ok;
    };
  }

  const origDmg = game.damageMob?.bind(game);
  if (origDmg) {
    game.damageMob = function damageMob(mob: any, dmg: number, crit?: boolean) {
      const save = this.save;
      if (save?.skills) {
        const weapon = this.piece?.("weapon");
        const kind =
          (weapon as any)?.weaponKind ||
          weaponKindFromName((weapon as any)?.packKind || weapon?.name || "");
        const wSkill = weaponSkillId(kind);
        if (wSkill && save.skills[wSkill]) {
          dmg *= 1 + (save.skills[wSkill].level - 1) * 0.015;
        }
        const type = weapon?.type && weapon.type !== "typeless" ? String(weapon.type) : null;
        if (type && save.skills[typeSkillId(type)]) {
          dmg *= 1 + (save.skills[typeSkillId(type)].level - 1) * 0.018;
        }
      }
      return origDmg(mob, dmg, crit);
    };
  }

  if (game.save) ensureAll(game.save);
}
