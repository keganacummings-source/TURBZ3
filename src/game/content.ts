export type TypeId =
  | "normal"
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "electric"
  | "ice"
  | "void"
  | "light"
  | "spirit"
  | "ghoul";

export type Slot = "weapon" | "head" | "chest" | "legs" | "feet" | "relic";
export type QualityId = "worn" | "common" | "fine" | "rare" | "epic" | "legendary";
export type RaceId = "vesper" | "cinder" | "tide" | "thorn" | "rime";
export type MapId = "world" | "crypt" | "kiln";
export type FxId =
  | "voidring"
  | "solarnova"
  | "tidalsurge"
  | "briarburst"
  | "whitestorm"
  | "gravepulse"
  | "stormcrown"
  | "lanternwake"
  | "featherfall"
  | "bloodmoon";

export type ClassId =
  | "warden" | "pyromancer" | "tidecaller" | "briarmage" | "frostblade"
  | "voidwalker" | "lightbringer" | "spiritbinder" | "ghoulknight" | "stormrider"
  | "shadowdancer" | "ironclad" | "wildheart" | "runesmith" | "bloodreaver"
  | "aetherist" | "gravekeeper" | "skyarcher" | "plaguebearer" | "chronomancer";

export const CLASSES = [
  { id: "warden" as const, name: "Warden", type: "earth" as const, blurb: "Shield of the barrow.", specialty: "High defense and root control", starterMoves: ["root", "measured", "aegis"], sprite: 0 },
  { id: "pyromancer" as const, name: "Pyromancer", type: "fire" as const, blurb: "Ash and appetite.", specialty: "Burn DoTs and area fire", starterMoves: ["ember", "cinder", "pyrelunge"], sprite: 1 },
  { id: "tidecaller" as const, name: "Tidecaller", type: "water" as const, blurb: "The sea answers.", specialty: "Soak, leech, and wave pressure", starterMoves: ["soak", "brine", "tidemend"], sprite: 2 },
  { id: "briarmage" as const, name: "Briarmage", type: "earth" as const, blurb: "Garden of thorns.", specialty: "Roots and bleed thickets", starterMoves: ["thorn", "vine", "briaroll"], sprite: 3 },
  { id: "frostblade" as const, name: "Frostblade", type: "ice" as const, blurb: "Glass edge.", specialty: "Crit shards and sleep", starterMoves: ["shard", "frost", "icecrown"], sprite: 4 },
  { id: "voidwalker" as const, name: "Voidwalker", type: "void" as const, blurb: "Steps between lanterns.", specialty: "Blink and gloom", starterMoves: ["lantern", "veilstep", "shroud"], sprite: 5 },
  { id: "lightbringer" as const, name: "Lightbringer", type: "light" as const, blurb: "Chapel steel.", specialty: "Expose and mend", starterMoves: ["flash", "halo", "dawn"], sprite: 6 },
  { id: "spiritbinder" as const, name: "Spiritbinder", type: "spirit" as const, blurb: "Whispers first.", specialty: "Gloom and leech bites", starterMoves: ["creep", "bite", "whisper"], sprite: 7 },
  { id: "ghoulknight" as const, name: "Ghoulknight", type: "ghoul" as const, blurb: "Hunger in plate.", specialty: "Leech and fear", starterMoves: ["backbite", "marrow", "rattle"], sprite: 8 },
  { id: "stormrider" as const, name: "Stormrider", type: "electric" as const, blurb: "Thunder's mount.", specialty: "Priority jolts and chain", starterMoves: ["jolt", "storm", "gust"], sprite: 9 },
  { id: "shadowdancer" as const, name: "Shadowdancer", type: "void" as const, blurb: "Never where you look.", specialty: "High mobility and crit", starterMoves: ["veilstep", "backbite", "creep"], sprite: 10 },
  { id: "ironclad" as const, name: "Ironclad", type: "normal" as const, blurb: "The wall that walks.", specialty: "Guard and heavy hits", starterMoves: ["aegis", "hammer", "measured"], sprite: 11 },
  { id: "wildheart" as const, name: "Wildheart", type: "air" as const, blurb: "Beast-blooded.", specialty: "Lunge and howl", starterMoves: ["lunge", "howl", "gust"], sprite: 12 },
  { id: "runesmith" as const, name: "Runesmith", type: "earth" as const, blurb: "Words in stone.", specialty: "Wards and quakes", starterMoves: ["quake", "shell", "root"], sprite: 13 },
  { id: "bloodreaver" as const, name: "Bloodreaver", type: "ghoul" as const, blurb: "Takes what it needs.", specialty: "Life steal and expose", starterMoves: ["bite", "marrow", "grin"], sprite: 14 },
  { id: "aetherist" as const, name: "Aetherist", type: "air" as const, blurb: "Wind as weapon.", specialty: "Ranged priority and silence", starterMoves: ["gust", "whiteout", "howl"], sprite: 15 },
  { id: "gravekeeper" as const, name: "Gravekeeper", type: "spirit" as const, blurb: "Tends the restless.", specialty: "Sleep and dirge", starterMoves: ["spore", "dirge", "whisper"], sprite: 16 },
  { id: "skyarcher" as const, name: "Skyarcher", type: "air" as const, blurb: "From the high branch.", specialty: "Long range and crit", starterMoves: ["gust", "shard", "lunge"], sprite: 17 },
  { id: "plaguebearer" as const, name: "Plaguebearer", type: "earth" as const, blurb: "The garden turns foul.", specialty: "Poison roots and sleep", starterMoves: ["spore", "vine", "root"], sprite: 18 },
  { id: "chronomancer" as const, name: "Chronomancer", type: "void" as const, blurb: "Steals the next second.", specialty: "Priority and silence", starterMoves: ["veilstep", "whiteout", "lantern"], sprite: 19 },
];

export const CLASS_BY_ID = Object.fromEntries(CLASSES.map(c => [c.id, c])) as Record<ClassId, (typeof CLASSES)[number]>;

export const TILE = 32;
export const WORLD_W = 420;
export const WORLD_H = 288;

export function scaleTile(tx: number, ty: number) {
  return {
    tx: Math.max(3, Math.min(WORLD_W - 4, Math.round(tx * (WORLD_W / 84)))),
    ty: Math.max(3, Math.min(WORLD_H - 4, Math.round(ty * (WORLD_H / 60)))),
  };
}

export function levelNearHunter(hunter: number, roll: number): number {
  const delta = Math.floor(roll * 11) - 5;
  return Math.max(1, Math.floor(hunter) + delta);
}

export function rarityForLevel(level: number, roll: number, boss = false): number {
  if (boss) return 3;
  const t = Math.max(0, Math.min(1, (level - 1) / 40));
  const epic = 0.04 + t * 0.28;
  const rare = 0.1 + t * 0.24;
  const uncommon = 0.2 + t * 0.16;
  if (roll < epic) return 3;
  if (roll < epic + rare) return 2;
  if (roll < epic + rare + uncommon) return 1;
  return 0;
}

export const TYPES: Record<TypeId, { name: string; color: string; strong: TypeId[]; weak: TypeId[]; immune: TypeId[] }> = {
  normal: { name: "Normal", color: "#c8c0b0", strong: [], weak: ["earth", "spirit"], immune: [] },
  fire: { name: "Fire", color: "#e25a32", strong: ["ice", "void"], weak: ["water", "earth"], immune: [] },
  water: { name: "Water", color: "#3a7eb8", strong: ["fire", "earth"], weak: ["electric", "ice"], immune: [] },
  earth: { name: "Earth", color: "#8a6a3a", strong: ["fire", "electric"], weak: ["water", "air"], immune: ["electric"] },
  air: { name: "Air", color: "#9ad8c8", strong: ["earth", "spirit"], weak: ["electric", "ice"], immune: ["earth"] },
  electric: { name: "Electric", color: "#f2d43a", strong: ["water", "air"], weak: ["earth", "void"], immune: [] },
  ice: { name: "Ice", color: "#9ad0ff", strong: ["air", "earth"], weak: ["fire", "light"], immune: [] },
  void: { name: "Void", color: "#6a4cff", strong: ["spirit", "normal"], weak: ["light"], immune: [] },
  light: { name: "Light", color: "#fff1a8", strong: ["void", "spirit"], weak: ["fire", "earth"], immune: [] },
  spirit: { name: "Spirit", color: "#c9a6e8", strong: ["spirit", "ice"], weak: ["void"], immune: ["normal"] },
  ghoul: { name: "Ghoul", color: "#8d72a8", strong: ["spirit", "void"], weak: ["light", "fire"], immune: [] },
};

export const TYPE_IDS = Object.keys(TYPES) as TypeId[];

export function typeMult(atk: TypeId, def: TypeId): number {
  if (TYPES[def].immune.includes(atk)) return 0;
  if (TYPES[atk].strong.includes(def)) return 2;
  if (TYPES[atk].weak.includes(def)) return 0.5;
  return 1;
}

export type AttackForm = "melee" | "ranged" | "spell";
export type ReactKind = "strike" | "counter" | "move" | "roll" | "guard" | "heal";
export type Tactic = "strike" | "blink" | "ward" | "lunge" | "heavy" | "channel" | "heal" | "roll";

export type Move = {
  id: string; name: string; type: TypeId; power: number; accuracy: number; crit: number;
  priority: number; effect: string; anim: string[]; range: number; about: string;
  tactic?: Tactic; react?: ReactKind; fail?: number;
};

export function moveTactic(m: Move): Tactic {
  if (m.tactic) return m.tactic;
  if (m.effect === "mend") return "heal";
  if (m.effect === "shell") return "ward";
  return "strike";
}
export function reactOf(m: Move): ReactKind {
  if (m.react) return m.react;
  const tactic = moveTactic(m);
  if (tactic === "roll") return "roll";
  if (tactic === "blink" || tactic === "lunge") return "move";
  if (tactic === "ward") return "guard";
  if (tactic === "heal") return "heal";
  return "strike";
}
export function defenseFail(m: Move, fatigue: number): number {
  const kind = reactOf(m);
  if (kind === "strike" || kind === "guard" || kind === "heal") return 0;
  const base = m.fail ?? (kind === "counter" ? 36 : kind === "move" ? 24 : 14);
  return Math.min(82, Math.round(base + Math.max(0, fatigue) * 14));
}
export function rollCover(traveled: number, reach: number): number {
  const need = Math.max(40, reach * 0.38);
  return Math.max(0, Math.min(1, traveled / need));
}

export const MOVES: Move[] = [
  { id: "wail", name: "First Wail", type: "fire", power: 30, accuracy: 100, crit: 6, priority: 2, effect: "none", anim: ["beam", "spark"], range: 120, about: "A thin cry that still burns." },
  { id: "ember", name: "Ember Trail", type: "fire", power: 42, accuracy: 95, crit: 12, priority: 1, effect: "burn", anim: ["beam", "spark", "burst"], range: 130, about: "Leaves a burning stitch." },
  { id: "cinder", name: "Cinder Bite", type: "fire", power: 55, accuracy: 85, crit: 18, priority: 0, effect: "burn", anim: ["slash", "spark", "burst"], range: 48, about: "Close, cruel, and hot." },
  { id: "grin", name: "Glass Grin", type: "fire", power: 48, accuracy: 90, crit: 28, priority: 1, effect: "expose", anim: ["slash", "prism"], range: 52, about: "A smiling cut that opens guard." },
  { id: "soak", name: "Drip Hex", type: "water", power: 32, accuracy: 100, crit: 6, priority: 1, effect: "soak", anim: ["rain", "spiral"], range: 120, about: "Soaks the joints." },
  { id: "brine", name: "Brine Lash", type: "water", power: 52, accuracy: 86, crit: 14, priority: 0, effect: "soak", anim: ["slash", "rain"], range: 70, about: "Salt that bites twice." },
  { id: "leech", name: "Sip Vein", type: "water", power: 36, accuracy: 95, crit: 8, priority: 1, effect: "leech", anim: ["beam", "orbit"], range: 100, about: "Drinks a little life back." },
  { id: "spore", name: "Crypt Spore", type: "earth", power: 28, accuracy: 95, crit: 6, priority: 1, effect: "sleep", anim: ["orbit", "rain"], range: 110, about: "Dust that makes eyelids heavy." },
  { id: "root", name: "Grave Root", type: "earth", power: 34, accuracy: 100, crit: 4, priority: 0, effect: "root", anim: ["spiral", "shield"], range: 90, about: "Pins feet to the barrow." },
  { id: "thorn", name: "Coffin Thorn", type: "earth", power: 46, accuracy: 90, crit: 10, priority: 1, effect: "none", anim: ["slash", "burst"], range: 56, about: "A thorn from the lid." },
  { id: "quake", name: "Grave Quake", type: "earth", power: 50, accuracy: 88, crit: 10, priority: 0, effect: "expose", anim: ["pulse", "burst"], range: 80, about: "The floor takes a side." },
  { id: "vine", name: "Widow Vine", type: "earth", power: 50, accuracy: 88, crit: 12, priority: 0, effect: "root", anim: ["spiral", "slash"], range: 78, about: "Binds, then tightens." },
  { id: "gust", name: "Ghost Gust", type: "air", power: 38, accuracy: 96, crit: 14, priority: 3, effect: "none", anim: ["spiral", "slash"], range: 130, about: "A fast cutting gust." },
  { id: "howl", name: "Banshee Howl", type: "air", power: 46, accuracy: 90, crit: 10, priority: 2, effect: "gloom", anim: ["orbit", "pulse"], range: 150, about: "Fear in a clean note." },
  { id: "jolt", name: "Grave Jolt", type: "electric", power: 36, accuracy: 97, crit: 12, priority: 3, effect: "spark", anim: ["spark", "beam"], range: 140, about: "A precise electrical jab." },
  { id: "storm", name: "Storm Wail", type: "electric", power: 50, accuracy: 86, crit: 8, priority: 1, effect: "spark", anim: ["spark", "burst"], range: 150, about: "The sky answers back." },
  { id: "shard", name: "Ice Shard", type: "ice", power: 36, accuracy: 100, crit: 16, priority: 2, effect: "none", anim: ["prism", "beam"], range: 130, about: "A clean frozen needle." },
  { id: "frost", name: "Frost Bite", type: "ice", power: 44, accuracy: 92, crit: 12, priority: 1, effect: "sleep", anim: ["rain", "prism"], range: 110, about: "Cold enough to dream." },
  { id: "whiteout", name: "Whiteout", type: "ice", power: 48, accuracy: 90, crit: 8, priority: 0, effect: "silence", anim: ["rain", "pulse"], range: 100, about: "Steals the next word." },
  { id: "lantern", name: "Void Lantern", type: "void", power: 33, accuracy: 100, crit: 6, priority: 2, effect: "gloom", anim: ["orbit", "beam"], range: 120, about: "A light that eats light." },
  { id: "shroud", name: "Widow Shroud", type: "void", power: 38, accuracy: 94, crit: 12, priority: 1, effect: "gloom", anim: ["orbit", "spiral"], range: 100, about: "Wraps the rhythm." },
  { id: "dirge", name: "Hollow Dirge", type: "void", power: 54, accuracy: 84, crit: 18, priority: 0, effect: "sleep", anim: ["orbit", "rain", "pulse"], range: 130, about: "The long note under the floor." },
  { id: "halo", name: "Halo Mend", type: "light", power: 22, accuracy: 100, crit: 4, priority: 2, effect: "mend", anim: ["spiral", "shield"], range: 40, about: "Mends the caster." },
  { id: "flash", name: "Holy Flash", type: "light", power: 46, accuracy: 90, crit: 14, priority: 2, effect: "expose", anim: ["prism", "burst"], range: 120, about: "A lance of chapel-light." },
  { id: "dawn", name: "Dawn Lance", type: "light", power: 40, accuracy: 100, crit: 10, priority: 2, effect: "none", anim: ["beam", "spark"], range: 145, about: "Focused and unkind to void." },
  { id: "creep", name: "Shadow Creep", type: "spirit", power: 42, accuracy: 94, crit: 12, priority: 1, effect: "gloom", anim: ["orbit", "spiral"], range: 100, about: "Arrives before the body does." },
  { id: "bite", name: "Night Bite", type: "spirit", power: 52, accuracy: 86, crit: 18, priority: 1, effect: "leech", anim: ["slash", "orbit"], range: 48, about: "Teeth with a receipt." },
  { id: "whisper", name: "Grave Whisper", type: "spirit", power: 30, accuracy: 100, crit: 6, priority: 3, effect: "gloom", anim: ["orbit", "beam"], range: 140, about: "A low chill." },
  { id: "rattle", name: "Bone Rattle", type: "normal", power: 40, accuracy: 95, crit: 10, priority: 1, effect: "spark", anim: ["slash", "burst"], range: 52, about: "Knuckles on a lid." },
  { id: "marrow", name: "Marrow Drain", type: "normal", power: 34, accuracy: 95, crit: 6, priority: 1, effect: "leech", anim: ["beam", "orbit"], range: 70, about: "Takes the warmth out of a rib." },
  { id: "measured", name: "Measured Strike", type: "normal", power: 30, accuracy: 100, crit: 5, priority: 2, effect: "none", anim: ["slash"], range: 48, about: "Clean tempo." },
  { id: "shell", name: "Urn Shell", type: "water", power: 18, accuracy: 100, crit: 0, priority: 2, effect: "shell", anim: ["shield", "rain"], range: 40, about: "A wet ward.", tactic: "ward" },
  { id: "veilstep", name: "Veil Step", type: "void", power: 16, accuracy: 100, crit: 10, priority: 3, effect: "none", anim: ["orbit", "slash"], range: 170, about: "A short blink and a nick.", tactic: "blink", react: "move", fail: 24 },
  { id: "backbite", name: "Backbite", type: "ghoul", power: 18, accuracy: 96, crit: 18, priority: 2, effect: "leech", anim: ["slash", "orbit"], range: 160, about: "A sip from the spine.", tactic: "blink", react: "move", fail: 28 },
  { id: "aegis", name: "Three-Ward", type: "light", power: 0, accuracy: 100, crit: 0, priority: 3, effect: "shell", anim: ["shield"], range: 40, about: "No incoming harm for three seconds.", tactic: "ward", react: "guard" },
  { id: "icecrown", name: "Ice Crown", type: "ice", power: 0, accuracy: 100, crit: 0, priority: 3, effect: "shell", anim: ["prism", "shield"], range: 40, about: "Three seconds of glass.", tactic: "ward", react: "guard" },
  { id: "lunge", name: "Reed Lunge", type: "air", power: 26, accuracy: 90, crit: 12, priority: 2, effect: "none", anim: ["slash"], range: 130, about: "Dash in, nick, spring back.", tactic: "lunge", react: "move", fail: 20 },
  { id: "pyrelunge", name: "Pyre Lunge", type: "fire", power: 30, accuracy: 86, crit: 14, priority: 1, effect: "burn", anim: ["slash", "spark"], range: 140, about: "A burning step.", tactic: "lunge", react: "move", fail: 22 },
  { id: "hammer", name: "Grave Hammer", type: "earth", power: 78, accuracy: 78, crit: 8, priority: 0, effect: "root", anim: ["burst", "pulse"], range: 52, about: "A heavy windup.", tactic: "heavy" },
  { id: "roll", name: "Salt Roll", type: "normal", power: 0, accuracy: 100, crit: 0, priority: 3, effect: "none", anim: ["spiral"], range: 80, about: "Distance decides the blow.", tactic: "roll", react: "roll", fail: 16 },
  { id: "briaroll", name: "Briar Roll", type: "earth", power: 10, accuracy: 100, crit: 6, priority: 3, effect: "none", anim: ["spiral", "slash"], range: 90, about: "A thorn nick on the way through.", tactic: "roll", react: "roll", fail: 18 },
  { id: "tidemend", name: "Tide Mend", type: "water", power: 28, accuracy: 100, crit: 0, priority: 2, effect: "mend", anim: ["rain", "shield"], range: 40, about: "Drink the fight back.", tactic: "heal", react: "heal" },
];

export const MOVE_BY_ID: Record<string, Move> = Object.fromEntries(MOVES.map(m => [m.id, m]));

// Gems system
export type GemId = string;
export type Enchant = { id: string; name: string; effect: string; value?: number };
export type Gem = {
  id: GemId; moveId: string; name: string; type: TypeId; quality: QualityId;
  enchantments: Enchant[]; unlocked: boolean;
};
export const MAX_GEMS = 5;
export const MAX_ENCHANTS_PER_GEM = 10;
export const SKILL_POINTS_PER_LEVEL = 3;
export function gemUnlockCost(quality: QualityId): number {
  const table: Record<QualityId, number> = { worn: 1, common: 2, fine: 3, rare: 5, epic: 8, legendary: 12 };
  return table[quality] ?? 2;
}
export function makeGem(moveId: string, quality: QualityId = "common", enchants: Enchant[] = []): Gem {
  const m = MOVE_BY_ID[moveId];
  if (!m) throw new Error("unknown move " + moveId);
  return {
    id: `gem_${moveId}_${Math.random().toString(36).slice(2, 8)}`,
    moveId, name: m.name, type: m.type, quality,
    enchantments: enchants.slice(0, MAX_ENCHANTS_PER_GEM), unlocked: false,
  };
}
export function allSpellGems() {
  return MOVES.map(m => ({ moveId: m.id, name: m.name, type: m.type, effect: m.effect, about: m.about }));
}

export const RACES = [
  { id: "vesper" as const, name: "Vesper", type: "void" as const, blurb: "Pale chapel blood.", hair: 0, tall: 1 },
  { id: "cinder" as const, name: "Cinder", type: "fire" as const, blurb: "Ash-court daughters.", hair: 1, tall: 1 },
  { id: "tide" as const, name: "Tide", type: "water" as const, blurb: "Reach-born.", hair: 2, tall: 1 },
  { id: "thorn" as const, name: "Thorn", type: "earth" as const, blurb: "Hollow gardeners.", hair: 3, tall: 1 },
  { id: "rime" as const, name: "Rime", type: "ice" as const, blurb: "March glass.", hair: 4, tall: 1 },
];

export type MonsterDef = { id: string; name: string; type: TypeId; template: number; about: string; boss?: boolean; animal?: boolean };
export const MONSTERS: MonsterDef[] = [
  { id: "onibi", name: "Onibi", type: "fire", template: 0, about: "A funeral flame." },
  { id: "nobi", name: "Nobi", type: "fire", template: 1, about: "Small and angry." },
  { id: "hinotama", name: "Hinotama", type: "fire", template: 2, about: "A fireball with opinions." },
  { id: "kagaribi", name: "Kagaribi", type: "fire", template: 3, about: "The watchfire that left." },
  { id: "shizuku", name: "Shizuku", type: "water", template: 4, about: "One drop, endless patience." },
  { id: "nami", name: "Nami", type: "water", template: 5, about: "A wave that stands up." },
  { id: "uroko", name: "Uroko", type: "water", template: 6, about: "Scales without the fish." },
  { id: "kasa", name: "Kasa", type: "water", template: 7, about: "An umbrella that rains upward." },
  { id: "tsuchi", name: "Tsuchi", type: "earth", template: 8, about: "Clay that refused the grave." },
  { id: "kusa", name: "Kusa", type: "earth", template: 9, about: "Grass with a grudge." },
  { id: "yanagi", name: "Yanagi", type: "earth", template: 10, about: "Willow hair." },
  { id: "mokuzu", name: "Mokuzu", type: "earth", template: 11, about: "River weed that hunts." },
  { id: "yuki", name: "Yuki", type: "ice", template: 12, about: "A child-shaped winter." },
  { id: "raiju", name: "Raiju", type: "electric", template: 13, about: "Thunder's pet." },
  { id: "kaze", name: "Kaze", type: "air", template: 14, about: "Wind wearing a beak." },
  { id: "hikari", name: "Hikari", type: "light", template: 15, about: "A halo that bites." },
  { id: "yami", name: "Yami", type: "spirit", template: 16, about: "The dark between lanterns." },
  { id: "kage", name: "Kage", type: "void", template: 17, about: "Your shadow, employed." },
  { id: "yomi", name: "Yomi", type: "void", template: 18, about: "A door that walks." },
  { id: "naraku", name: "Naraku", type: "void", template: 19, about: "The pit grew teeth." },
  { id: "muma", name: "Muma", type: "ghoul", template: 20, about: "A nun who kept the hunger." },
  { id: "umoregi", name: "Umoregi", type: "earth", template: 21, about: "Buried wood, still growing." },
  { id: "gaikotsu", name: "Gaikotsu", type: "ghoul", template: 22, about: "Bones on patrol." },
  { id: "wisp", name: "Tide Wisp", type: "spirit", template: 23, about: "Marsh-light with a hook." },
  { id: "saintling", name: "Marrow Saintling", type: "light", template: 24, about: "A small saint." },
];
export const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map(m => [m.id, m]));
export const ANIMALS: MonsterDef[] = [
  { id: "hare", name: "Briar Hare", type: "earth", template: 9, about: "Quick hide.", animal: true },
  { id: "boar", name: "Tusk Boar", type: "earth", template: 8, about: "Charges.", animal: true },
  { id: "stag", name: "Glass Stag", type: "air", template: 1, about: "The good hide.", animal: true },
  { id: "wolf", name: "Marrow Wolf", type: "ghoul", template: 13, about: "Hunts back.", animal: true },
  { id: "crow", name: "Veil Crow", type: "air", template: 14, about: "Feathers.", animal: true },
];
export const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map(a => [a.id, a]));
export type BiomeId = "crown" | "verdant" | "frost" | "void" | "tide" | "ashen" | "bone";
export const BIOME_MONSTERS: Record<BiomeId, string[]> = {
  crown: ["gaikotsu", "yami", "hikari"], verdant: ["kusa", "yanagi", "mokuzu", "umoregi", "tsuchi"],
  frost: ["yuki", "kaze", "hikari"], void: ["kage", "yomi", "naraku", "muma"],
  tide: ["shizuku", "nami", "uroko", "kasa", "wisp"], ashen: ["onibi", "nobi", "hinotama", "kagaribi", "raiju"],
  bone: ["gaikotsu", "muma", "yomi"],
};
export const ANIMAL_BIOME: Partial<Record<BiomeId, string[]>> = {
  verdant: ["hare", "boar", "stag"], frost: ["stag", "wolf", "hare"], crown: ["hare", "crow"],
  tide: ["crow", "hare"], bone: ["crow", "wolf"], ashen: ["boar", "crow"], void: ["crow", "wolf"],
};
export const WITCH_NAMES = ["Sister Vell", "Moth Adel", "Quinn Vale", "Harrow Nia", "Pell the Quiet", "Ash Widow", "Lark of the Pit", "Sera Coil", "Brine Nun", "Orris Hex"];

export function accountNeed(level: number): number {
  return Math.floor(140 * Math.pow(1.32, Math.max(0, level - 1)));
}
export function learnPool(level: number, classOrRace: ClassId | RaceId): string[] {
  const cls = CLASS_BY_ID[classOrRace as ClassId];
  const type = cls?.type ?? RACES.find(r => r.id === classOrRace)?.type ?? "normal";
  return MOVES.filter(m => m.power <= 22 + level * 2.2 || m.type === type || m.type === "normal").map(m => m.id);
}

// Compat Gear (armor removed conceptually; needed for engine boot)
export type Gear = {
  uid: string; id: string; name: string; slot: Slot; type: TypeId; quality: QualityId;
  level: number; style: number; fxSeed: number; moves: string[];
  enchants: { id: string; power: number }[]; setId?: string | null; price?: number;
};
export type Rng = () => number;
export function mulberry32(a: number): Rng {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function irand(rng: Rng, n: number): number { return Math.floor(rng() * Math.max(1, n)); }
export function pick<T>(rng: Rng, arr: T[]): T { return arr[irand(rng, arr.length)]!; }
export function nextUid(): string { return Math.random().toString(36).slice(2, 10); }
const QUALITY_ORDER: QualityId[] = ["worn", "common", "fine", "rare", "epic", "legendary"];
export function rollGear(rng: Rng, opts: {
  level?: number; slot?: Slot; luck?: number; floor?: QualityId | null;
  raceBias?: string | null; typeBias?: TypeId | null;
} = {}): Gear {
  const level = Math.max(1, opts.level ?? 1);
  const slot: Slot = opts.slot ?? pick(rng, ["weapon", "head", "chest", "legs", "feet", "relic"] as Slot[]);
  const type: TypeId = opts.typeBias ?? pick(rng, TYPE_IDS);
  let qi = Math.min(5, Math.floor(rng() * 3 + (opts.luck ?? 0) / 40));
  if (opts.floor) { const fi = QUALITY_ORDER.indexOf(opts.floor); if (fi > qi) qi = fi; }
  const quality = QUALITY_ORDER[qi] ?? "common";
  const style = irand(rng, 20);
  const fxSeed = irand(rng, 9999);
  const movePool = MOVES.filter(m => m.type === type || m.type === "normal").slice(0, 8);
  const moves = movePool.length ? [pick(rng, movePool).id] : ["measured"];
  return {
    uid: nextUid(), id: `g_${slot}_${style}`, name: `${quality} ${type} ${slot}`,
    slot, type, quality, level, style, fxSeed, moves, enchants: [], setId: null,
    price: 10 + level * 4 + qi * 12,
  };
}
export function gearPrice(g: Gear): number { return g.price ?? 10 + g.level * 4; }
export function gearScore(g: Gear | null | undefined): number {
  if (!g) return 0;
  return g.level * 3 + Math.max(0, QUALITY_ORDER.indexOf(g.quality)) * 8 + (g.moves?.length ?? 0) * 2;
}
export function qualityName(q: QualityId): string { return q; }
export const ENCHANT_BY_ID: Record<string, { id: string; name: string }> = {
  power: { id: "power", name: "Power" }, crit: { id: "crit", name: "Crit" }, leech: { id: "leech", name: "Leech" },
};
export const ENCHANTS = Object.values(ENCHANT_BY_ID);
export type EnchantRoll = { id: string; power: number };
export const SETS: { id: string; name: string }[] = [];
export const SET_BY_ID: Record<string, { id: string; name: string }> = {};
export const WEAPONS: any[] = [];
export const WEAPON_KINDS: any[] = [];
export type GhostLook = { body: number; eyes: number; horn: number; tail: number; tint: number };
export function rollGhostLook(rng: Rng, ..._a: any[]): GhostLook {
  return { body: irand(rng, 6), eyes: irand(rng, 6), horn: irand(rng, 4), tail: irand(rng, 4), tint: irand(rng, 8) };
}
export function attackForm(m: Move): AttackForm {
  if (m.range > 90) return m.anim.includes("beam") || m.anim.includes("prism") ? "spell" : "ranged";
  return "melee";
}
export function attackRange(m: Move): number { return m.range; }
export function formTag(f: AttackForm): string { return f; }
export function rangedStyle(_m: Move): string { return "bolt"; }
export function huntMove(..._a: any[]): Move { return MOVES[0]!; }
export function rollInnate(..._a: any[]): string[] { return []; }
export function packMoves(..._a: any[]): string[] { return []; }
export function ensureGearMoves(g: Gear): string[] { return g.moves ?? []; }
export function bodyRead(..._a: any[]): any { return {}; }
export type ItemDef = { id: string; name: string; about: string };
export const ITEMS: ItemDef[] = [
  { id: "salt", name: "Salt", about: "A pinch for the dead." },
  { id: "band", name: "Bandage", about: "Stops a little bleeding." },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export type QuestDef = { id: string; name: string };
export const QUESTS: QuestDef[] = [];
export type NpcDef = { id: string; name: string; about?: string; role?: string };
export const NPCS: NpcDef[] = [];
export type Poi = { id: string; name: string; tx: number; ty: number; map?: MapId };
export const POIS: Poi[] = [];
export const STARTER_MOVES: Record<string, string[]> = {
  vesper: ["lantern", "veilstep", "measured"], cinder: ["ember", "cinder", "measured"],
  tide: ["soak", "brine", "measured"], thorn: ["root", "thorn", "measured"], rime: ["shard", "frost", "measured"],
};
export type SkillId = "combat" | "hunting" | "foraging" | "trading" | "spirit" | "craft";
export const SKILLS: { id: SkillId; name: string }[] = [
  { id: "combat", name: "Combat" }, { id: "hunting", name: "Hunting" }, { id: "foraging", name: "Foraging" },
  { id: "trading", name: "Trading" }, { id: "spirit", name: "Spirit" }, { id: "craft", name: "Craft" },
];
export function skillNeed(level: number): number { return Math.floor(40 * Math.pow(1.35, Math.max(0, level - 1))); }
export function skillLine(id: SkillId): string { return SKILLS.find(s => s.id === id)?.name ?? id; }
