/**
 * Runtime hardcore combat patch: speed-based first turn, allow player to open/answer.
 * Applied when TurbzGame is constructed (call applyHardcorePatch(game)).
 */
import { MOVE_BY_ID, MOVES } from "./content";

export function applyHardcorePatch(game: any): void {
  if (!game || game.__hcPatched) return;
  game.__hcPatched = true;

  const origCast = game.cast?.bind(game);
  game.cast = function cast(index: number) {
    const save = this.save;
    if (!save) return;
    const id = save.bar[index];
    const move = id ? MOVE_BY_ID[id] : undefined;
    if (!move) return;
    if (this.rules === "hardcore") {
      if (!this.duel) {
        const foes = this.engagedFoes?.() ?? [];
        if (!foes.length) {
          this.say?.("Get in range first. Fastest witch takes the first verse.");
          return;
        }
        this.openDuel?.(foes);
      }
      this.answerDuel?.(move);
      return;
    }
    return origCast?.(index);
  };

  game.openDuel = function openDuel(foes: any[]) {
    const ranked = [...foes].sort((a, b) => {
      const ma = MOVE_BY_ID[a.move] ?? MOVES[0];
      const mb = MOVE_BY_ID[b.move] ?? MOVES[0];
      return (b.speed ?? 0) * 10 + (mb?.priority ?? 0) * 8 - ((a.speed ?? 0) * 10 + (ma?.priority ?? 0) * 8);
    });
    const youSpeed = this.playerSpeed?.() ?? 10;
    const foeSpeed = ranked[0]?.speed ?? 0;
    if (youSpeed >= foeSpeed) {
      this.duel = {
        phase: "yours",
        queue: ranked,
        lead: null,
        moveId: "",
        beat: "You are faster. Your verse opens the exchange.",
        followers: [],
        wait: 0,
      };
      this.say?.("You are faster. Strike first — turn for turn.");
    } else {
      this.duel = { phase: "answer", queue: ranked, lead: null, moveId: "", beat: "", followers: [], wait: 0 };
      this.declareLead?.();
      this.say?.("They are faster. Answer their verse — turn for turn.");
    }
    this.syncHud?.(true);
  };

  const origCastMove = game.castMove?.bind(game);
  if (origCastMove) {
    game.castMove = function castMove(move: any, prefer?: any) {
      const had = this.duelAllow;
      if (this.rules === "hardcore" && this.duel) this.duelAllow = true;
      try {
        const ok = origCastMove(move, prefer);
        if (ok) {
          const held = this.piece?.("weapon");
          const wk = held?.weaponKind || held?.packKind || "";
          const map: Record<string, string> = {
            blade: "w_blade",
            bow: "w_bow",
            crossbow: "w_crossbow",
            axe: "w_axe",
            staff: "w_staff",
            tome: "w_tome",
            sling: "w_sling",
            claw: "w_claw",
            spear: "w_spear",
            mace: "w_mace",
            dagger: "w_dagger",
            shield: "w_shield",
          };
          const key = map[String(wk).toLowerCase()];
          if (key) this.gainSkill?.(key, 3);
        }
        return ok;
      } finally {
        this.duelAllow = had;
      }
    };
  }

  const ensureWeaponSkills = () => {
    const save = game.save;
    if (save?.skills) {
      for (const id of [
        "w_blade", "w_bow", "w_crossbow", "w_axe", "w_staff", "w_tome",
        "w_sling", "w_claw", "w_spear", "w_mace", "w_dagger", "w_shield",
      ]) {
        if (!save.skills[id]) save.skills[id] = { level: 1, xp: 0 };
      }
    }
  };

  const origBegin = game.begin?.bind(game);
  if (origBegin) {
    game.begin = function begin(...args: any[]) {
      const r = origBegin(...args);
      ensureWeaponSkills();
      return r;
    };
  }

  const origContinue = game.continueGame?.bind(game);
  if (origContinue) {
    game.continueGame = function continueGame(...args: any[]) {
      const r = origContinue(...args);
      ensureWeaponSkills();
      return r;
    };
  }
}
