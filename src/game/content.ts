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

export const TILE = 32;
export const WORLD_W = 420;
export const WORLD_H = 288;

/** POIs were laid out on the old 84×60 chart. The live map stretches them. */
export function scaleTile(tx: number, ty: number): { tx: number; ty: number } {
  return {
    tx: Math.max(3, Math.min(WORLD_W - 4, Math.round(tx * (WORLD_W / 84)))),
    ty: Math.max(3, Math.min(WORLD_H - 4, Math.round(ty * (WORLD_H / 60)))),
  };
}

/** Spawn level sits on the hunter, five levels either side. */
export function levelNearHunter(hunter: number, roll: number): number {
  const delta = Math.floor(roll * 11) - 5;
  return Math.max(1, Math.floor(hunter) + delta);
}

/** 0 common, 1 uncommon, 2 rare, 3 epic. Higher levels shift the roll up. */
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

export const TYPES: Record<
  TypeId,
  { name: string; color: string; strong: TypeId[]; weak: TypeId[]; immune: TypeId[] }
> = {
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

export type Move = {
  id: string;
  name: string;
  type: TypeId;
  power: number;
  accuracy: number;
  crit: number;
  priority: number;
  effect: string;
  anim: string[];
  range: number;
  about: string;
  tactic?: Tactic;
  /** How the verse answers an incoming blow in a duel. */
  react?: ReactKind;
  /** Base slip chance for counters, steps, and rolls. Fatigue stacks on top. */
  fail?: number;
};

export type Tactic = "strike" | "blink" | "ward" | "lunge" | "heavy" | "channel" | "heal" | "roll";

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

/** Slip chance. Strikes, guards, and heals do not slip. Fatigue is stacked defensive answers. */
export function defenseFail(m: Move, fatigue: number): number {
  const kind = reactOf(m);
  if (kind === "strike" || kind === "guard" || kind === "heal") return 0;
  const base = m.fail ?? (kind === "counter" ? 36 : kind === "move" ? 24 : 14);
  return Math.min(82, Math.round(base + Math.max(0, fatigue) * 14));
}

/** 0 eats the blow. 1 is clear of it. Reach is the incoming attack. */
export function rollCover(traveled: number, reach: number): number {
  const need = Math.max(40, reach * 0.38);
  return Math.max(0, Math.min(1, traveled / need));
}

export const MOVES: Move[] = [
  { id: "wail", name: "First Wail", type: "fire", power: 30, accuracy: 100, crit: 6, priority: 2, effect: "none", anim: ["beam", "spark"], range: 120, about: "A thin cry that still burns." },
  { id: "ember", name: "Ember Trail", type: "fire", power: 42, accuracy: 95, crit: 12, priority: 1, effect: "burn", anim: ["beam", "spark", "burst"], range: 130, about: "Leaves a burning stitch." },
  { id: "cinder", name: "Cinder Bite", type: "fire", power: 55, accuracy: 85, crit: 18, priority: 0, effect: "burn", anim: ["slash", "spark", "burst"], range: 48, about: "Close, cruel, and hot." },
  { id: "grin", name: "Glass Grin", type: "fire", power: 48, accuracy: 90, crit: 28, priority: 1, effect: "expose", anim: ["slash", "prism"], range: 52, about: "A smiling cut that opens guard." },
  { id: "foam", name: "Pale Foam", type: "water", power: 30, accuracy: 100, crit: 4, priority: 2, effect: "none", anim: ["rain", "pulse"], range: 110, about: "Soft water, perfect tempo." },
  { id: "soak", name: "Drip Hex", type: "water", power: 32, accuracy: 100, crit: 6, priority: 1, effect: "soak", anim: ["rain", "spiral"], range: 120, about: "Soaks the joints." },
  { id: "brine", name: "Brine Lash", type: "water", power: 52, accuracy: 86, crit: 14, priority: 0, effect: "soak", anim: ["slash", "rain"], range: 70, about: "Salt that bites twice in memory." },
  { id: "leech", name: "Sip Vein", type: "water", power: 36, accuracy: 95, crit: 8, priority: 1, effect: "leech", anim: ["beam", "orbit"], range: 100, about: "Drinks a little life back." },
  { id: "tide", name: "Rising Dirge", type: "water", power: 44, accuracy: 92, crit: 10, priority: 1, effect: "none", anim: ["rain", "spiral"], range: 140, about: "The hymn of the reach." },
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
  { id: "hex", name: "Chain Hex", type: "void", power: 40, accuracy: 92, crit: 16, priority: 1, effect: "spark", anim: ["spark", "beam"], range: 125, about: "Hexes leap once." },
  { id: "halo", name: "Halo Mend", type: "light", power: 22, accuracy: 100, crit: 4, priority: 2, effect: "mend", anim: ["spiral", "shield"], range: 40, about: "Mends the caster." },
  { id: "flash", name: "Holy Flash", type: "light", power: 46, accuracy: 90, crit: 14, priority: 2, effect: "expose", anim: ["prism", "burst"], range: 120, about: "A lance of chapel-light." },
  { id: "dawn", name: "Dawn Lance", type: "light", power: 40, accuracy: 100, crit: 10, priority: 2, effect: "none", anim: ["beam", "spark"], range: 145, about: "Focused and unkind to void." },
  { id: "creep", name: "Shadow Creep", type: "spirit", power: 42, accuracy: 94, crit: 12, priority: 1, effect: "gloom", anim: ["orbit", "spiral"], range: 100, about: "Arrives before the body does." },
  { id: "bite", name: "Night Bite", type: "spirit", power: 52, accuracy: 86, crit: 18, priority: 1, effect: "leech", anim: ["slash", "orbit"], range: 48, about: "Teeth with a receipt." },
  { id: "whisper", name: "Grave Whisper", type: "spirit", power: 30, accuracy: 100, crit: 6, priority: 3, effect: "gloom", anim: ["orbit", "beam"], range: 140, about: "A low chill." },
  { id: "rattle", name: "Bone Rattle", type: "normal", power: 40, accuracy: 95, crit: 10, priority: 1, effect: "spark", anim: ["slash", "burst"], range: 52, about: "Knuckles on a lid." },
  { id: "marrow", name: "Marrow Drain", type: "normal", power: 34, accuracy: 95, crit: 6, priority: 1, effect: "leech", anim: ["beam", "orbit"], range: 70, about: "Takes the warmth out of a rib." },
  { id: "measured", name: "Measured Strike", type: "normal", power: 30, accuracy: 100, crit: 5, priority: 2, effect: "none", anim: ["slash"], range: 48, about: "Clean tempo. Nothing wasted." },
  { id: "shell", name: "Urn Shell", type: "water", power: 18, accuracy: 100, crit: 0, priority: 2, effect: "shell", anim: ["shield", "rain"], range: 40, about: "A wet ward.", tactic: "ward" },
  { id: "veilstep", name: "Veil Step", type: "void", power: 16, accuracy: 100, crit: 10, priority: 3, effect: "none", anim: ["orbit", "slash"], range: 170, about: "A short blink and a nick. It slips if you spam it.", tactic: "blink", react: "move", fail: 24 },
  { id: "backbite", name: "Backbite", type: "ghoul", power: 18, accuracy: 96, crit: 18, priority: 2, effect: "leech", anim: ["slash", "orbit"], range: 160, about: "A sip from the spine. Not a feast.", tactic: "blink", react: "move", fail: 28 },
  { id: "aegis", name: "Three-Ward", type: "light", power: 0, accuracy: 100, crit: 0, priority: 3, effect: "shell", anim: ["shield"], range: 40, about: "No incoming harm for three seconds.", tactic: "ward", react: "guard" },
  { id: "icecrown", name: "Ice Crown", type: "ice", power: 0, accuracy: 100, crit: 0, priority: 3, effect: "shell", anim: ["prism", "shield"], range: 40, about: "Three seconds of glass.", tactic: "ward", react: "guard" },
  { id: "lunge", name: "Reed Lunge", type: "air", power: 26, accuracy: 90, crit: 12, priority: 2, effect: "none", anim: ["slash"], range: 130, about: "Dash in, nick, spring back. It can snag.", tactic: "lunge", react: "move", fail: 20 },
  { id: "pyrelunge", name: "Pyre Lunge", type: "fire", power: 30, accuracy: 86, crit: 14, priority: 1, effect: "burn", anim: ["slash", "spark"], range: 140, about: "A burning step that only chips.", tactic: "lunge", react: "move", fail: 22 },
  { id: "hammer", name: "Grave Hammer", type: "earth", power: 78, accuracy: 78, crit: 8, priority: 0, effect: "root", anim: ["burst", "pulse"], range: 52, about: "A heavy windup. You cannot weave through it.", tactic: "heavy" },
  { id: "hymn", name: "Chapel Hymn", type: "light", power: 66, accuracy: 90, crit: 8, priority: 0, effect: "expose", anim: ["beam", "prism"], range: 160, about: "A cast. Other verses wait.", tactic: "channel" },
  { id: "voidhymn", name: "Void Hymn", type: "void", power: 72, accuracy: 84, crit: 12, priority: 0, effect: "gloom", anim: ["orbit", "pulse"], range: 170, about: "The long note. Your hands are busy.", tactic: "channel" },
  { id: "roll", name: "Salt Roll", type: "normal", power: 0, accuracy: 100, crit: 0, priority: 3, effect: "none", anim: ["spiral"], range: 80, about: "Distance decides the blow. Spam and you trip.", tactic: "roll", react: "roll", fail: 16 },
  { id: "briaroll", name: "Briar Roll", type: "earth", power: 10, accuracy: 100, crit: 6, priority: 3, effect: "none", anim: ["spiral", "slash"], range: 90, about: "A thorn nick on the way through. Not a kill.", tactic: "roll", react: "roll", fail: 18 },
  { id: "tidemend", name: "Tide Mend", type: "water", power: 28, accuracy: 100, crit: 0, priority: 2, effect: "mend", anim: ["rain", "shield"], range: 40, about: "Drink the fight back.", tactic: "heal", react: "heal" },
  { id: "riposte", name: "Salt Riposte", type: "normal", power: 24, accuracy: 100, crit: 16, priority: 3, effect: "none", anim: ["slash", "spark"], range: 48, about: "Catch the blade and return a chip. It slips often.", tactic: "strike", react: "counter", fail: 36 },
  { id: "glassparry", name: "Glass Parry", type: "ice", power: 22, accuracy: 100, crit: 20, priority: 3, effect: "expose", anim: ["prism", "slash"], range: 52, about: "A cold answer. Fail and the glass is yours.", tactic: "strike", react: "counter", fail: 38 },
  { id: "thornanswer", name: "Thorn Answer", type: "earth", power: 26, accuracy: 96, crit: 10, priority: 2, effect: "root", anim: ["spiral", "slash"], range: 56, about: "Roots bite the striker if you do not slip.", tactic: "strike", react: "counter", fail: 34 },
  { id: "ashcounter", name: "Ash Counter", type: "fire", power: 28, accuracy: 94, crit: 14, priority: 2, effect: "burn", anim: ["spark", "burst"], range: 60, about: "A cinder flicked back. Small, mean, unreliable.", tactic: "strike", react: "counter", fail: 40 },
  { id: "voidrebuke", name: "Void Rebuke", type: "void", power: 20, accuracy: 100, crit: 12, priority: 3, effect: "gloom", anim: ["orbit", "pulse"], range: 70, about: "Turn their note inside out.", tactic: "strike", react: "counter", fail: 36 },
  { id: "lanternvault", name: "Lantern Vault", type: "light", power: 14, accuracy: 100, crit: 8, priority: 3, effect: "none", anim: ["beam", "spiral"], range: 150, about: "Leap the blow and tap them with the lantern.", tactic: "blink", react: "move", fail: 22 },
  { id: "tideslip", name: "Tide Slip", type: "water", power: 12, accuracy: 100, crit: 6, priority: 3, effect: "soak", anim: ["rain", "spiral"], range: 120, about: "Slide under the swing. Salt on the way out.", tactic: "lunge", react: "move", fail: 20 },
  { id: "crowhop", name: "Crow Hop", type: "air", power: 14, accuracy: 100, crit: 12, priority: 3, effect: "none", anim: ["spiral", "slash"], range: 140, about: "A bird-step. The nick is a feather.", tactic: "blink", react: "move", fail: 18 },
  { id: "gravepounce", name: "Grave Pounce", type: "ghoul", power: 22, accuracy: 88, crit: 16, priority: 2, effect: "leech", anim: ["slash", "orbit"], range: 130, about: "In, bite, out. The bite is a sip.", tactic: "lunge", react: "move", fail: 26 },
  { id: "ashstep", name: "Ash Step", type: "fire", power: 16, accuracy: 92, crit: 10, priority: 2, effect: "burn", anim: ["spark", "spiral"], range: 136, about: "Leave a coal where you were.", tactic: "blink", react: "move", fail: 24 },
  { id: "cindertumble", name: "Cinder Tumble", type: "fire", power: 8, accuracy: 100, crit: 4, priority: 3, effect: "none", anim: ["spark", "spiral"], range: 88, about: "Roll through coals. Distance or a scorch.", tactic: "roll", react: "roll", fail: 16 },
  { id: "frostskate", name: "Frost Skate", type: "ice", power: 6, accuracy: 100, crit: 8, priority: 3, effect: "none", anim: ["prism", "spiral"], range: 110, about: "Skate the length of the blow.", tactic: "roll", react: "roll", fail: 12 },
  { id: "widowtumble", name: "Widow Tumble", type: "void", power: 8, accuracy: 100, crit: 6, priority: 3, effect: "gloom", anim: ["orbit", "spiral"], range: 96, about: "A black roll. Far enough and the hymn misses.", tactic: "roll", react: "roll", fail: 18 },
  { id: "brace", name: "Bone Brace", type: "normal", power: 0, accuracy: 100, crit: 0, priority: 3, effect: "shell", anim: ["shield"], range: 40, about: "Eat the hit on purpose. No slip. No chip.", tactic: "ward", react: "guard" },
  { id: "choirbell", name: "Choir Bell", type: "light", power: 58, accuracy: 88, crit: 10, priority: 1, effect: "expose", anim: ["pulse", "prism", "burst"], range: 150, about: "A bell that staggers the ring.", tactic: "channel" },
  { id: "marrowcomet", name: "Marrow Comet", type: "ghoul", power: 62, accuracy: 82, crit: 14, priority: 0, effect: "leech", anim: ["beam", "burst", "orbit"], range: 160, about: "A rib torn into a comet.", tactic: "channel" },
  { id: "stormlattice", name: "Storm Lattice", type: "electric", power: 48, accuracy: 90, crit: 12, priority: 2, effect: "spark", anim: ["spark", "beam", "burst"], range: 155, about: "A cage of lightning. It jumps.", tactic: "strike" },
  { id: "briarcathedral", name: "Briar Cathedral", type: "earth", power: 54, accuracy: 86, crit: 8, priority: 0, effect: "root", anim: ["spiral", "burst", "slash"], range: 90, about: "The garden stands up and grabs.", tactic: "heavy" },
  { id: "solarguillotine", name: "Solar Guillotine", type: "fire", power: 70, accuracy: 76, crit: 18, priority: 0, effect: "burn", anim: ["slash", "burst", "spark"], range: 64, about: "One bright cut. The windup is honest.", tactic: "heavy" },
  { id: "tidecourt", name: "Tide Court", type: "water", power: 46, accuracy: 92, crit: 8, priority: 1, effect: "soak", anim: ["rain", "spiral", "pulse"], range: 140, about: "A court of waves sits on them.", tactic: "strike" },
  { id: "whiteprocession", name: "White Procession", type: "ice", power: 44, accuracy: 94, crit: 10, priority: 1, effect: "sleep", anim: ["prism", "rain", "orbit"], range: 130, about: "Saints of frost walk through the lane.", tactic: "strike" },
  { id: "hexcarousel", name: "Hex Carousel", type: "void", power: 42, accuracy: 90, crit: 16, priority: 1, effect: "spark", anim: ["orbit", "spark", "beam"], range: 135, about: "Hexes ride a wheel and hop once.", tactic: "strike" },
  { id: "bansheereel", name: "Banshee Reel", type: "air", power: 40, accuracy: 96, crit: 12, priority: 3, effect: "gloom", anim: ["spiral", "slash", "orbit"], range: 145, about: "A dancing cut that arrives early.", tactic: "strike" },
  { id: "gravewaltz", name: "Grave Waltz", type: "spirit", power: 38, accuracy: 94, crit: 14, priority: 2, effect: "leech", anim: ["orbit", "slash", "pulse"], range: 100, about: "Three steps, one sip.", tactic: "lunge", react: "move", fail: 22 },
  { id: "lanternrain", name: "Lantern Rain", type: "light", power: 36, accuracy: 100, crit: 8, priority: 1, effect: "expose", anim: ["beam", "rain", "spark"], range: 150, about: "Votives fall in a line.", tactic: "strike" },
  { id: "kilnbreath", name: "Kiln Breath", type: "fire", power: 50, accuracy: 88, crit: 10, priority: 1, effect: "burn", anim: ["burst", "spark", "beam"], range: 120, about: "The kiln exhales.", tactic: "strike" },
  { id: "saltcathedral", name: "Salt Cathedral", type: "water", power: 18, accuracy: 100, crit: 0, priority: 2, effect: "mend", anim: ["rain", "shield", "pulse"], range: 40, about: "A chapel of brine knits you.", tactic: "heal", react: "heal" },
  { id: "focuslance", name: "Focus Lance", type: "light", power: 36, accuracy: 100, crit: 22, priority: 3, effect: "expose", anim: ["beam", "spark"], range: 150, about: "A fast lance. It can speak before theirs.", tactic: "strike" },
  { id: "interrupt", name: "Veil Interrupt", type: "void", power: 22, accuracy: 100, crit: 8, priority: 4, effect: "silence", anim: ["orbit", "beam"], range: 130, about: "Cut their verse. Yours is small on purpose.", tactic: "strike" },
  { id: "packfear", name: "Pack Fear", type: "spirit", power: 18, accuracy: 100, crit: 4, priority: 2, effect: "gloom", anim: ["orbit", "pulse"], range: 160, about: "The ring flinches. Little damage, long chill.", tactic: "strike" },
  { id: "summonbell", name: "Summon Bell", type: "void", power: 12, accuracy: 100, crit: 4, priority: 1, effect: "none", anim: ["orbit", "pulse", "spark"], range: 80, about: "A bell for things that should stay buried.", tactic: "channel" },
  { id: "bloodstep", name: "Blood Step", type: "ghoul", power: 20, accuracy: 92, crit: 14, priority: 2, effect: "leech", anim: ["slash", "orbit", "burst"], range: 110, about: "Step through them and keep a drop.", tactic: "blink", react: "move", fail: 26 },
  { id: "mirrorward", name: "Mirror Ward", type: "ice", power: 8, accuracy: 100, crit: 6, priority: 3, effect: "shell", anim: ["prism", "shield", "spark"], range: 70, about: "A pane that answers with a shard.", tactic: "ward", react: "counter", fail: 32 },
  { id: "hearthline", name: "Hearth Line", type: "fire", power: 34, accuracy: 96, crit: 8, priority: 1, effect: "burn", anim: ["beam", "spark"], range: 125, about: "A straight road of coals.", tactic: "strike" },
  { id: "moonhook", name: "Moon Hook", type: "air", power: 32, accuracy: 94, crit: 18, priority: 2, effect: "none", anim: ["slash", "spiral"], range: 78, about: "A hooked cut that lifts them.", tactic: "strike" },
  { id: "ossuary", name: "Ossuary Drum", type: "normal", power: 44, accuracy: 90, crit: 8, priority: 0, effect: "spark", anim: ["burst", "pulse", "slash"], range: 88, about: "The floor keeps time and then hits.", tactic: "heavy" },
  { id: "rimespire", name: "Rime Spire", type: "ice", power: 52, accuracy: 84, crit: 16, priority: 1, effect: "root", anim: ["prism", "beam", "burst"], range: 120, about: "A spire from under their heel.", tactic: "strike" },
  { id: "widowfan", name: "Widow Fan", type: "void", power: 30, accuracy: 100, crit: 10, priority: 2, effect: "gloom", anim: ["orbit", "slash", "rain"], range: 100, about: "A fan of black silk. It touches twice in the eye.", tactic: "strike" },
  { id: "chapelwheel", name: "Chapel Wheel", type: "light", power: 40, accuracy: 92, crit: 12, priority: 1, effect: "expose", anim: ["prism", "spiral", "burst"], range: 110, about: "A wheel of saints. Pretty, and unkind.", tactic: "strike" },
  { id: "brinecloak", name: "Brine Cloak", type: "water", power: 0, accuracy: 100, crit: 0, priority: 3, effect: "shell", anim: ["rain", "shield"], range: 40, about: "Salt on the shoulders. The next blow is smaller.", tactic: "ward", react: "guard" },
];

export const MOVE_BY_ID: Record<string, Move> = Object.fromEntries(MOVES.map((m) => [m.id, m]));

const MELEE_IDS = new Set(["cinder", "grin", "thorn", "bite", "rattle", "measured", "brine"]);
const SPELL_IDS = new Set(["dirge", "storm", "howl", "quake", "whiteout", "flash", "hex", "shroud", "dawn", "creep", "marrow", "vine", "ember", "tide"]);

export function attackForm(m: Move): AttackForm {
  const tactic = moveTactic(m);
  if (tactic === "channel" || tactic === "heal" || tactic === "ward") return "spell";
  if (tactic === "blink" || tactic === "lunge" || tactic === "heavy" || tactic === "roll") return "melee";
  if (m.effect === "mend" || m.effect === "shell") return "spell";
  if (MELEE_IDS.has(m.id)) return "melee";
  if (SPELL_IDS.has(m.id)) return "spell";
  return "ranged";
}

/** Melee is short. Blinks, lunges, and spells reach across a street. */
export function attackRange(m: Move): number {
  const tactic = moveTactic(m);
  if (tactic === "blink" || tactic === "lunge") return Math.max(150, m.range);
  if (tactic === "channel" || tactic === "ward" || tactic === "heal" || tactic === "roll") return Math.max(tactic === "roll" ? 80 : 40, m.range);
  const form = attackForm(m);
  if (form === "melee") return 44;
  if (form === "spell") return Math.max(156, m.range);
  const style = rangedStyle(m);
  return Math.max(150, m.range) + (style === "reach" ? 48 : 0);
}

export function rangedStyle(m: Move): "volley" | "reload" | "reach" {
  let n = 0;
  for (const c of m.id) n += c.charCodeAt(0);
  return (["volley", "reload", "reach"] as const)[n % 3]!;
}

export function formTag(m: Move): string {
  const form = attackForm(m);
  if (form === "melee") return "melee · cuts armor";
  if (form === "spell") return "spell · pure";
  const style = rangedStyle(m);
  if (style === "volley") return "ranged · volley";
  if (style === "reload") return "ranged · fast";
  return "ranged · long";
}

export function huntMove(type: TypeId): Move {
  const live = (m: Move) => m.effect !== "mend" && m.effect !== "shell";
  return (
    MOVES.find((m) => m.type === type && attackForm(m) === "spell" && live(m)) ??
    MOVES.find((m) => m.type === type && attackForm(m) === "ranged" && live(m)) ??
    MOVES.find((m) => attackForm(m) === "spell" && live(m)) ??
    MOVES[0]!
  );
}

export const RACES: {
  id: RaceId;
  name: string;
  type: TypeId;
  blurb: string;
  hair: number;
  tall: number;
}[] = [
  { id: "vesper", name: "Vesper", type: "void", blurb: "Pale chapel blood. Long dark hair, a quiet step, void in the teeth.", hair: 0, tall: 1 },
  { id: "cinder", name: "Cinder", type: "fire", blurb: "Ash-court daughters. Short flame-cut hair and a hotter basic strike.", hair: 1, tall: 1 },
  { id: "tide", name: "Tide", type: "water", blurb: "Reach-born. Wave hair, fin-tips at the ear, brine on every lash.", hair: 2, tall: 1 },
  { id: "thorn", name: "Thorn", type: "earth", blurb: "Hollow gardeners. Braided briar, wider stance, roots that answer.", hair: 3, tall: 1 },
  { id: "rime", name: "Rime", type: "ice", blurb: "March glass. Crystal bob, a cold priority, sleeps that stick.", hair: 4, tall: 1 },
];

export type SetDef = { id: string; race: RaceId; name: string; style: number; fx: FxId; bonus: string };

const SET_ROWS: Record<RaceId, [string, FxId, string][]> = {
  vesper: [
    ["Eclipse Sentinel", "voidring", "Null ring eats one hit, then throws a void pulse."],
    ["Widow Psalm", "gravepulse", "Dirge pulse sleeps nearby foes and mends you."],
    ["Lantern Nun", "lanternwake", "Lanterns orbit and hex-chain anything they touch."],
    ["Quiet Crown", "voidring", "A crown of silence lengthens enemy cooldowns."],
    ["Hexweave", "stormcrown", "Hex sparks jump to a second target."],
    ["Sable Choir", "featherfall", "Afterimage step — a echo strike copies your last hit."],
    ["Umbral Veil", "bloodmoon", "Leech aura while the set sings."],
    ["Starless Aegis", "whitestorm", "A black snow that roots and wards."],
    ["Oracle Ash", "solarnova", "Inverted sun: light damage that fears itself."],
    ["Last Vespers", "lanternwake", "On proc, a chapel bell staggers the field."],
    ["Chapel Mourning", "gravepulse", "A mourning bell sleeps the closest foe and mends you."],
    ["Black Hymnal", "voidring", "Sung notes shorten enemy casts."],
    ["Night Abbess", "bloodmoon", "Leech grows while you stand still."],
    ["Grave Lattice", "briarburst", "A lattice of graves roots the ring."],
    ["Violet Reliquary", "lanternwake", "Relics orbit and chain void."],
    ["Hollow Saint", "whitestorm", "A hollow ward that reflects one spell."],
    ["Moon Nun", "featherfall", "Moonstep leaves a striking afterimage."],
    ["Dirge Plate", "stormcrown", "Heavy dirge sparks on every third hit."],
    ["Ink Procession", "voidring", "Ink trails silence what they touch."],
    ["Final Bell", "solarnova", "One chapel sun. It fears itself."],
  ],
  cinder: [
    ["Solaris Paladin", "solarnova", "Solar nova burns and exposes everything close."],
    ["Ashen Vow", "gravepulse", "Vow-flames linger and tick harder on bosses."],
    ["Glass Grin", "bloodmoon", "Crits splatter cinders that chain once."],
    ["Kiln Regalia", "solarnova", "Standing in your own fire heals you."],
    ["Ember Shogun", "stormcrown", "A flaming arc on every third cast."],
    ["Cinder Court", "featherfall", "Dash-embers trail and re-ignite burn."],
    ["Pyre Mantle", "lanternwake", "Lanterns explode if a burned foe dies."],
    ["Scorch Saint", "voidring", "Fire ring that ignores water once per proc."],
    ["Brand Crown", "bloodmoon", "Branded foes take stab as if they were ice."],
    ["Last Lantern", "lanternwake", "A giant lantern falls on the marked foe."],
    ["Furnace Bride", "solarnova", "The aisle burns. Close foes are exposed."],
    ["Coal Coronet", "gravepulse", "Coal sleep, then a hotter wake."],
    ["Spark Regalia", "stormcrown", "Sparks jump a second target."],
    ["Hearth Tyrant", "bloodmoon", "Standing in your fire leeches."],
    ["Cinder Nun", "lanternwake", "Votive flames mend you in combat."],
    ["Magma Psalm", "briarburst", "Magma roots, then ticks."],
    ["Brand Widow", "voidring", "A brand that ignores water once."],
    ["Kiln Valkyrie", "featherfall", "A flaming gap-closer."],
    ["Ash Parade", "whitestorm", "Ash whiteout silences the pack."],
    ["Last Ember", "solarnova", "The kiln answers. One huge pulse."],
  ],
  tide: [
    ["Tidecaller", "tidalsurge", "A wave knocks foes back and soaks them."],
    ["Brine Reliquary", "tidalsurge", "Soak spreads when you leech."],
    ["Foam Cantor", "featherfall", "You skate — move faster while soaked ground is near."],
    ["Urn Admiral", "whitestorm", "Shell plus a salt burst."],
    ["Pearl Dirge", "gravepulse", "Rising dirge heals allies in the lobby too."],
    ["Kelp Regent", "briarburst", "Tide-briars root soaked targets."],
    ["Abyss Net", "voidring", "Pulls a foe into melee range."],
    ["Moonwell", "lanternwake", "Moonwater cleanses you and flashes light."],
    ["Stormfoam", "stormcrown", "Lightning rides the spray."],
    ["Drowned Choir", "bloodmoon", "Leech wave. The sea keeps a tithe."],
    ["Salt Empress", "tidalsurge", "A salt crown that soaks and knocks back."],
    ["Coral Aegis", "whitestorm", "Coral ward. The next hit is halved."],
    ["Drift Cantor", "featherfall", "You skate farther on soaked ground."],
    ["Pearl March", "lanternwake", "Pearls orbit and flash light."],
    ["Brine Widow", "bloodmoon", "Brine leech spreads soak."],
    ["Harbor Saint", "gravepulse", "A harbor dirge heals the lobby."],
    ["Wave Reliquary", "tidalsurge", "The relic is a wave."],
    ["Foam Knight", "stormcrown", "Lightning rides the spray."],
    ["Deep Choir", "voidring", "The deep pulls a foe into reach."],
    ["Last Tide", "tidalsurge", "The sea itself answers."],
  ],
  thorn: [
    ["Thorn Regalia", "briarburst", "Briars erupt, root, and bleed the circle."],
    ["Coffin Garden", "gravepulse", "Gravesprouts sleep then burst."],
    ["Moss Empress", "briarburst", "A heal-over-time thicket."],
    ["Widow Orchard", "bloodmoon", "Thorns return a cut of damage taken."],
    ["Root Sovereign", "briarburst", "One foe is pinned for a long root."],
    ["Spore Court", "lanternwake", "Spore lanterns sleep in a wide ring."],
    ["Bark Psalm", "whitestorm", "Bark ward. The next hit is halved."],
    ["Hollow Antler", "featherfall", "A leaping gore with earth stab."],
    ["Umber Relic", "gravepulse", "Quake plus expose."],
    ["Briar Nun", "voidring", "Holy thorns — light and earth together."],
    ["Vine Abbess", "briarburst", "Vines erupt and bleed the circle."],
    ["Orchard Plate", "whitestorm", "Bark plate. Half the next blow."],
    ["Mycel Crown", "gravepulse", "Spores sleep, then burst."],
    ["Green Reliquary", "lanternwake", "Spore lanterns in a wide ring."],
    ["Briar Valkyrie", "featherfall", "A leaping gore of thorns."],
    ["Root Nun", "briarburst", "One foe is pinned a long time."],
    ["Spore March", "bloodmoon", "Thorns return a cut of damage."],
    ["Bark Widow", "voidring", "A quiet thicket that silences."],
    ["Garden Psalm", "solarnova", "A green sun. It heals you a little."],
    ["Last Thicket", "briarburst", "The garden answers. Huge root."],
  ],
  rime: [
    ["Frost Coronet", "whitestorm", "Whiteout silences and slows the pack."],
    ["Glass March", "whitestorm", "Shards fan in a prism volley."],
    ["Sleeping Saint", "gravepulse", "A deeper sleep. Waking them hurts."],
    ["Rime Valkyrie", "featherfall", "Ice wings — a gap-closer of frost."],
    ["Pale Reliquary", "lanternwake", "Cold lanterns that spark on impact."],
    ["Marrow Ice", "bloodmoon", "Freeze-leech. Stillness drinks."],
    ["White Psalm", "solarnova", "A pale sun that is still ice."],
    ["Shard Empress", "stormcrown", "Crit shards splinter to neighbors."],
    ["Hush Crown", "voidring", "Silence ring. Moves lock for a breath."],
    ["Last Winter", "whitestorm", "The march itself answers. Huge storm, one pulse."],
    ["Glacier Bride", "whitestorm", "A white aisle that slows the pack."],
    ["Ice Abbess", "gravepulse", "Deeper sleep. Waking them hurts."],
    ["Crystal March", "stormcrown", "Shards fan and splinter."],
    ["Pale Choir", "lanternwake", "Cold lanterns spark on impact."],
    ["Frost Reliquary", "voidring", "A hush ring. Moves lock."],
    ["Snow Valkyrie", "featherfall", "Ice wings close the gap."],
    ["Hush Plate", "whitestorm", "Silence and slow together."],
    ["Winter Nun", "bloodmoon", "Freeze-leech. Stillness drinks."],
    ["Shard Psalm", "solarnova", "A pale sun that is still ice."],
    ["Last Frost", "whitestorm", "The year ends. One killing storm."],
  ],
};

export const SETS: SetDef[] = (Object.keys(SET_ROWS) as RaceId[]).flatMap((race) =>
  SET_ROWS[race].map((row, i) => ({
    id: `${race}-${i}`,
    race,
    name: row[0],
    style: i,
    fx: row[1],
    bonus: row[2],
  })),
);

export const SET_BY_ID: Record<string, SetDef> = Object.fromEntries(SETS.map((s) => [s.id, s]));

export const SLOT_NOUN: Record<Slot, string> = {
  weapon: "Blade",
  head: "Helm",
  chest: "Raiment",
  legs: "Skirt",
  feet: "Boots",
  relic: "Relic",
};

export const WEAPONS = [
  "Grave Needle",
  "Choir Knife",
  "Salt Hook",
  "Briar Bill",
  "Rime Pick",
  "Lantern Rod",
  "Bone Knuckle",
  "Void Spindle",
];

export const WEAPON_KINDS = ["Sling", "Crossbow", "Bow", "Axe", "Staff", "Tome", "Blade", "Claw"] as const;

export type GhostLook = {
  body: number;
  horns: number;
  tails: number;
  eyes: number;
  trail: number;
  skin: number;
  aggression: "hunt" | "drift";
  move: string;
};

export function rollGhostLook(rng: Rng, rarity: number, move: string, bias?: "hunt" | "drift"): GhostLook {
  const huntBias = bias === "hunt" ? 0.72 : bias === "drift" ? 0.18 : 0.42;
  return {
    body: irand(rng, 6),
    horns: irand(rng, 2 + Math.min(3, rarity)),
    tails: 1 + irand(rng, 2 + Math.min(3, rarity)),
    eyes: 1 + irand(rng, 1 + Math.min(4, rarity)),
    trail: irand(rng, 6),
    skin: irand(rng, 5),
    aggression: rng() < huntBias ? "hunt" : "drift",
    move,
  };
}

export const ENCHANTS: { id: string; name: string; about: string; max: number; unit: "%" | "flat" }[] = [
  { id: "double_strike", name: "Double Strike", about: "Chance to hit twice", max: 40, unit: "%" },
  { id: "second_chance", name: "Second Chance", about: "Once, break instead of dying", max: 1, unit: "flat" },
  { id: "loot_find", name: "Loot Find", about: "Better drops", max: 50, unit: "%" },
  { id: "xp_boost", name: "XP Boost", about: "More battle XP", max: 40, unit: "%" },
  { id: "catch_boost", name: "Catch Boost", about: "Jars hold tighter", max: 30, unit: "%" },
  { id: "kyo_find", name: "Kyo Magnet", about: "More Kyo", max: 45, unit: "%" },
  { id: "ward", name: "Ward", about: "Take less damage", max: 35, unit: "%" },
  { id: "might", name: "Might", about: "Deal more damage", max: 35, unit: "%" },
  { id: "swift", name: "Swift", about: "Lower cooldowns", max: 25, unit: "%" },
  { id: "harvest", name: "Harvest", about: "Better node yields", max: 40, unit: "%" },
  { id: "fish_luck", name: "Fish Luck", about: "Faster bites", max: 40, unit: "%" },
  { id: "shop_charm", name: "Shop Charm", about: "Cheaper shops", max: 30, unit: "%" },
  { id: "sell_boost", name: "Merchant Tongue", about: "Higher sell prices", max: 30, unit: "%" },
  { id: "crit_edge", name: "Crit Edge", about: "Higher crit chance", max: 25, unit: "%" },
  { id: "regen", name: "Afterglow", about: "Heal after a kill", max: 20, unit: "%" },
  { id: "boss_bane", name: "Boss Bane", about: "Extra damage to bosses", max: 40, unit: "%" },
  { id: "shroom_sense", name: "Shroom Sense", about: "Richer mushrooms", max: 35, unit: "%" },
  { id: "echo_guard", name: "Echo Guard", about: "Chance to ignore a hit", max: 15, unit: "%" },
  { id: "spark_life", name: "Spark of Life", about: "Bonus spirit when a fight starts", max: 25, unit: "%" },
  { id: "type_edge", name: "Typed Edge", about: "Extra stab when types match", max: 20, unit: "%" },
];

export const ENCHANT_BY_ID = Object.fromEntries(ENCHANTS.map((e) => [e.id, e]));

export const QUALITIES: { id: QualityId; name: string; mult: number }[] = [
  { id: "worn", name: "Worn", mult: 0.65 },
  { id: "common", name: "Common", mult: 1 },
  { id: "fine", name: "Fine", mult: 1.25 },
  { id: "rare", name: "Rare", mult: 1.6 },
  { id: "epic", name: "Epic", mult: 2.15 },
  { id: "legendary", name: "Legendary", mult: 3 },
];

export type EnchantRoll = { id: string; power: number };
export type Gear = {
  uid: string;
  slot: Slot;
  setId: string | null;
  style: number;
  name: string;
  level: number;
  quality: QualityId;
  type: TypeId;
  enchants: EnchantRoll[];
  fxSeed: number;
  price: number;
  /** Verses packed into the piece. Auto battle uses them while you carry it. */
  moves: string[];
};

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function irand(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[irand(rng, arr.length)]!;
}

let uidN = 1;
export function nextUid(): string {
  uidN += 1;
  return `g${Date.now().toString(36)}${uidN.toString(36)}`;
}

function rollQuality(rng: Rng, level: number, luck: number, floor: QualityId | null): (typeof QUALITIES)[number] {
  if (floor) return QUALITIES.find((q) => q.id === floor) ?? QUALITIES[1]!;
  const boost = level / 40 + luck / 100;
  const roll = rng() * (1 + boost * 0.35);
  if (roll > 1.22) return QUALITIES[5]!;
  if (roll > 1.05) return QUALITIES[4]!;
  if (roll > 0.82) return QUALITIES[3]!;
  if (roll > 0.55) return QUALITIES[2]!;
  if (roll > 0.28) return QUALITIES[1]!;
  return QUALITIES[0]!;
}

export function rollGear(
  rng: Rng,
  opts: {
    level: number;
    slot?: Slot;
    luck?: number;
    floor?: QualityId | null;
    raceBias?: RaceId | null;
    typeBias?: TypeId | null;
    setId?: string | null;
  },
): Gear {
  const slot = opts.slot ?? pick(rng, ["head", "chest", "legs", "feet", "relic", "weapon"] as Slot[]);
  const quality = rollQuality(rng, opts.level, opts.luck ?? 0, opts.floor ?? null);
  const type = opts.typeBias && rng() < 0.55 ? opts.typeBias : pick(rng, TYPE_IDS);
  let setId: string | null = null;
  let style = irand(rng, WEAPON_KINDS.length);
  let title = `${WEAPON_KINDS[style]} of ${WEAPONS[irand(rng, WEAPONS.length)]}`;
  if (slot !== "weapon") {
    const biased = opts.raceBias ? SETS.filter((s) => s.race === opts.raceBias) : SETS;
    const set = opts.setId ? SET_BY_ID[opts.setId]! : rng() < 0.62 && biased.length ? pick(rng, biased) : pick(rng, SETS);
    setId = set.id;
    style = set.style;
    title = set.name;
  }
  const qIndex = QUALITIES.findIndex((q) => q.id === quality.id);
  const count = Math.min(8, 1 + qIndex + (opts.level > 12 ? 1 : 0) + (rng() < 0.25 ? 1 : 0));
  const pool = [...ENCHANTS];
  const enchants: EnchantRoll[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = irand(rng, pool.length);
    const def = pool.splice(idx, 1)[0]!;
    const base = 1 + irand(rng, Math.max(1, Math.floor(def.max * 0.45)));
    const power =
      def.unit === "flat" && def.max <= 2
        ? 1
        : Math.max(1, Math.min(def.max, Math.floor((base + opts.level / 8) * quality.mult)));
    enchants.push({ id: def.id, power });
  }
  const gear: Gear = {
    uid: nextUid(),
    slot,
    setId,
    style,
    name: slot === "weapon" ? `${quality.name} ${TYPES[type].name} ${title}` : `${quality.name} ${TYPES[type].name} ${title} ${SLOT_NOUN[slot]}`,
    level: opts.level,
    quality: quality.id,
    type,
    enchants,
    fxSeed: irand(rng, 6),
    price: 0,
    moves: packMoves(rng, type, rng() < 0.42 ? 2 : 1),
  };
  gear.price = gearPrice(gear);
  return gear;
}

export function gearPrice(g: Gear): number {
  const q = QUALITIES.findIndex((x) => x.id === g.quality) + 1;
  const ep = g.enchants.reduce((s, e) => s + e.power * 8, 0);
  return Math.max(12, Math.floor(20 + g.level * 6 * q + ep));
}

export function gearScore(g: Gear): number {
  const q = QUALITIES.findIndex((x) => x.id === g.quality) + 1;
  const ench = g.enchants.reduce((s, e) => s + e.power, 0);
  return g.level * 12 + q * 28 + ench * 4 + (g.moves?.length ?? 0) * 6;
}

export function qualityName(id: QualityId): string {
  return QUALITIES.find((q) => q.id === id)?.name ?? id;
}

export type MonsterDef = {
  id: string;
  name: string;
  type: TypeId;
  template: number;
  about: string;
  boss?: boolean;
  animal?: boolean;
};

export const MONSTERS: MonsterDef[] = [
  { id: "onibi", name: "Onibi", type: "fire", template: 0, about: "A funeral flame that learned a face." },
  { id: "nobi", name: "Nobi", type: "fire", template: 1, about: "Small, quick, and already angry." },
  { id: "hinotama", name: "Hinotama", type: "fire", template: 2, about: "A fireball with opinions." },
  { id: "kagaribi", name: "Kagaribi", type: "fire", template: 3, about: "The watchfire that left its post." },
  { id: "shizuku", name: "Shizuku", type: "water", template: 4, about: "One drop, endless patience." },
  { id: "nami", name: "Nami", type: "water", template: 5, about: "A wave that stands up." },
  { id: "uroko", name: "Uroko", type: "water", template: 6, about: "Scales without the fish." },
  { id: "kasa", name: "Kasa", type: "water", template: 7, about: "An umbrella that rains upward." },
  { id: "tsuchi", name: "Tsuchi", type: "earth", template: 8, about: "Clay that refused the grave." },
  { id: "kusa", name: "Kusa", type: "earth", template: 9, about: "Grass with a grudge." },
  { id: "yanagi", name: "Yanagi", type: "earth", template: 10, about: "Willow hair, no woman under it." },
  { id: "mokuzu", name: "Mokuzu", type: "earth", template: 11, about: "River weed that learned to hunt." },
  { id: "yuki", name: "Yuki", type: "ice", template: 12, about: "A child-shaped winter." },
  { id: "raiju", name: "Raiju", type: "electric", template: 13, about: "Thunder's pet, off the leash." },
  { id: "kaze", name: "Kaze", type: "air", template: 14, about: "Wind wearing a beak." },
  { id: "hikari", name: "Hikari", type: "light", template: 15, about: "A halo that bites." },
  { id: "yami", name: "Yami", type: "spirit", template: 16, about: "The dark between two lanterns." },
  { id: "kage", name: "Kage", type: "void", template: 17, about: "Your shadow, employed." },
  { id: "yomi", name: "Yomi", type: "void", template: 18, about: "A door that walks." },
  { id: "naraku", name: "Naraku", type: "void", template: 19, about: "The pit grew teeth." },
  { id: "muma", name: "Muma", type: "ghoul", template: 20, about: "A nun who kept the hunger." },
  { id: "umoregi", name: "Umoregi", type: "earth", template: 21, about: "Buried wood, still growing." },
  { id: "gaikotsu", name: "Gaikotsu", type: "ghoul", template: 22, about: "Bones on patrol." },
  { id: "wisp", name: "Tide Wisp", type: "spirit", template: 23, about: "Marsh-light with a hook." },
  { id: "saintling", name: "Marrow Saintling", type: "light", template: 24, about: "A small saint. Still a problem." },
];

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));

export const ANIMALS: MonsterDef[] = [
  { id: "hare", name: "Briar Hare", type: "earth", template: 9, about: "Quick hide. A little meat.", animal: true },
  { id: "boar", name: "Tusk Boar", type: "earth", template: 8, about: "Charges. Leather if you live.", animal: true },
  { id: "stag", name: "Glass Stag", type: "air", template: 1, about: "The good hide.", animal: true },
  { id: "wolf", name: "Marrow Wolf", type: "ghoul", template: 13, about: "Hunts back.", animal: true },
  { id: "crow", name: "Veil Crow", type: "air", template: 14, about: "Feathers, a strip of meat.", animal: true },
];

export const ANIMAL_BY_ID: Record<string, MonsterDef> = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));

export const ANIMAL_BIOME: Partial<Record<BiomeId, string[]>> = {
  verdant: ["hare", "boar", "stag"],
  frost: ["stag", "wolf", "hare"],
  crown: ["hare", "crow"],
  tide: ["crow", "hare"],
  bone: ["crow", "wolf"],
  ashen: ["boar", "crow"],
  void: ["crow", "wolf"],
};

export const WITCH_NAMES = [
  "Sister Vell",
  "Moth Adel",
  "Quinn Vale",
  "Harrow Nia",
  "Pell the Quiet",
  "Ash Widow",
  "Lark of the Pit",
  "Sera Coil",
  "Brine Nun",
  "Orris Hex",
];

export type BiomeId = "crown" | "verdant" | "frost" | "void" | "tide" | "ashen" | "bone";

export const BIOME_MONSTERS: Record<BiomeId, string[]> = {
  crown: ["gaikotsu", "yami", "hikari"],
  verdant: ["kusa", "yanagi", "mokuzu", "umoregi", "tsuchi"],
  frost: ["yuki", "kaze", "hikari"],
  void: ["kage", "yomi", "naraku", "muma"],
  tide: ["shizuku", "nami", "uroko", "kasa", "wisp"],
  ashen: ["onibi", "nobi", "hinotama", "kagaribi", "raiju"],
  bone: ["gaikotsu", "muma", "yami", "saintling"],
};

export const SKILLS = [
  { id: "mining", name: "Mining" },
  { id: "woodcutting", name: "Woodcutting" },
  { id: "hunting", name: "Hunting" },
  { id: "catching", name: "Catching" },
  { id: "trading", name: "Trading" },
  { id: "fishing", name: "Fishing" },
  { id: "social", name: "Social" },
  { id: "shroom", name: "Shroom" },
  { id: "alchemy", name: "Alchemy" },
  { id: "adventuring", name: "Adventuring" },
  { id: "physical", name: "Physical" },
  { id: "magic", name: "Magic" },
] as const;

export type SkillId = (typeof SKILLS)[number]["id"];

export function skillNeed(level: number): number {
  return Math.max(20, Math.floor(40 * Math.pow(1.14, Math.min(level - 1, 40)) * (1 + (level - 1) * 0.02)));
}

export function skillLine(id: SkillId, level: number): string {
  const n = Math.max(0, level - 1);
  switch (id) {
    case "mining":
    case "woodcutting":
      return `+${(n * 0.35).toFixed(1)}% yield`;
    case "hunting":
      return `+${Math.min(40, n * 0.4).toFixed(1)}% wild damage`;
    case "catching":
      return `+${Math.min(25, n * 0.2).toFixed(1)}% jars`;
    case "trading":
      return `${Math.min(40, n * 0.25).toFixed(1)}% keener prices`;
    case "fishing":
      return `+${Math.min(80, n * 0.8).toFixed(0)}% bite speed`;
    case "social":
      return `+${Math.floor(n / 8)} story favor`;
    case "shroom":
      return `+${Math.min(40, n * 0.4).toFixed(1)}% patches`;
    case "alchemy":
      return `+${Math.min(35, n * 0.3).toFixed(1)}% brew`;
    case "adventuring":
      return `+${(n * 0.15).toFixed(1)} spirit / s`;
    case "physical":
      return `+${(n * 2).toFixed(0)}% physical weapons`;
    case "magic":
      return `+${(n * 2.5).toFixed(0)}% spells, −${Math.min(45, n * 1.2).toFixed(0)}% spell cooldown`;
    default:
      return "";
  }
}

export type ItemDef = { id: string; name: string; about: string; price: number; heal?: number; buff?: string };

export const ITEMS: ItemDef[] = [
  { id: "potion", name: "Potion", about: "Mends a modest wound.", price: 18, heal: 45 },
  { id: "big_potion", name: "Big Potion", about: "The good bottle.", price: 48, heal: 110 },
  { id: "ghost_jar", name: "Ghost Jar", about: "Catches a weakened spirit.", price: 26 },
  { id: "cleanse_salt", name: "Cleanse Salt", about: "Clears a hex. Quest salt.", price: 14 },
  { id: "spirit_candy", name: "Spirit Candy", about: "A rush of spirit.", price: 22, heal: 30 },
  { id: "smoke_bomb", name: "Smoke Bomb", about: "Step out of a fight.", price: 20 },
  { id: "blue_lantern", name: "Blue Lantern", about: "Verdant fungus that glows.", price: 16 },
  { id: "dreamspore", name: "Dreamspore", about: "Alchemy dust. Makes sleep.", price: 20 },
  { id: "embercap", name: "Embercap", about: "A hot cap from the wastes.", price: 18 },
  { id: "ironroot", name: "Ironroot", about: "Bitter root. Good in a phial.", price: 18 },
  { id: "warmth_tonic", name: "Warmth Tonic", about: "Brewed fire. Heals and stabs fire.", price: 0, heal: 70, buff: "fire" },
  { id: "cats_eye", name: "Cat's Eye Draught", about: "Crit drips for a short while.", price: 0, buff: "crit" },
  { id: "ironroot_phial", name: "Ironroot Phial", about: "A bark ward.", price: 0, buff: "ward" },
  { id: "fish", name: "Raw Fish", about: "Better cooked. Still food.", price: 8, heal: 18 },
  { id: "fish_meal", name: "Fish Meal", about: "Bram's way.", price: 0, heal: 55 },
  { id: "ore", name: "Vein Ore", about: "Crownfall will buy this.", price: 10 },
  { id: "timber", name: "Pale Timber", about: "Willow-cut.", price: 8 },
  { id: "meat", name: "Trail Meat", about: "From a hunt. Holt will buy it.", price: 9, heal: 22 },
  { id: "leather", name: "Hide Leather", about: "Ten hides and ten mushrooms stitch a piece at your account level.", price: 14 },
  { id: "mushroom", name: "Shroom", about: "The patch was generous.", price: 11 },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export type QuestDef = {
  id: string;
  name: string;
  about: string;
  giver: string;
  chapter: string;
  rewardKyo: number;
  rewardItems?: Record<string, number>;
};

export const QUESTS: QuestDef[] = [
  { id: "first_steps", name: "First Steps", about: "Win 3 battles anywhere in the wilds.", giver: "Miret", chapter: "I · The Hearth", rewardKyo: 40, rewardItems: { potion: 2, ghost_jar: 2 } },
  { id: "keeper_lanterns", name: "Keeper's Lanterns", about: "Catch a Light spirit and a Fire spirit.", giver: "Keel", chapter: "II · Two Flames", rewardKyo: 70, rewardItems: { lantern_jar: 0, blue_lantern: 2, big_potion: 1 } },
  { id: "marsh_walk", name: "Marsh Walk", about: "Visit Tide Reach, then catch a Water spirit.", giver: "Bram", chapter: "III · Salt Road", rewardKyo: 60, rewardItems: { ghost_jar: 3 } },
  { id: "ember_hunt", name: "Ember Hunt", about: "Catch two Fire spirits in the Ashen Wastes.", giver: "Vey", chapter: "IV · Cinder Yard", rewardKyo: 80, rewardItems: { potion: 3, embercap: 2 } },
  { id: "salt_run", name: "Salt Run", about: "Bring 2 Cleanse Salt to the ledger.", giver: "Holt", chapter: "V · The Tithe", rewardKyo: 90, rewardItems: { big_potion: 1 } },
  { id: "bone_patrol", name: "Bone Patrol", about: "Lay down 2 skeletons inside the Tiny Crypt.", giver: "Wren", chapter: "VI · The Door", rewardKyo: 100, rewardItems: { spirit_candy: 2 } },
  { id: "bone_king", name: "The Bone King", about: "Walk the Bone Garden path and break the Bone King.", giver: "Keel", chapter: "VII · The Lid", rewardKyo: 180, rewardItems: { big_potion: 2, ghost_jar: 2 } },
];

export type NpcDef = {
  id: string;
  name: string;
  role: string;
  female: boolean;
  outfit: number;
  hair: number;
  lines: string[];
  shop?: "general" | "armor" | "fence" | "alchemy" | "cook";
  shrine?: TypeId;
  map: MapId;
  tx: number;
  ty: number;
};

export const NPCS: NpcDef[] = [
  { id: "miret", name: "Caretaker Miret", role: "Hearth keeper", female: true, outfit: 0, hair: 3, map: "world", tx: 30, ty: 31, lines: ["THE HEARTH IS YOURS. SKILLS STAY WHEN THE VEIL TAKES THE REST.", "WIN THREE FIGHTS. THEN WE TALK ABOUT THE DOOR.", "CROWNFALL IS DAMAGED. IT IS STILL A CITY."] },
  { id: "vey", name: "Captain Vey", role: "Citadel guard", female: false, outfit: 1, hair: 1, map: "world", tx: 26, ty: 28, lines: ["THE ASHEN YARD IS LEAKING FIRE AGAIN.", "IF YOU HUNT, HUNT CLEAN. BRING ME COUNTS, NOT STORIES.", "HOLT THINKS A DEBT IS PAID IN BONE. HE IS NOT ALWAYS WRONG."] },
  { id: "orien", name: "Scribe Orien", role: "Ledger scribe", female: true, outfit: 2, hair: 0, map: "world", tx: 34, ty: 28, lines: ["EVERY ARMOR PIECE ROLLS ITS OWN TYPE. MATCH IT TO THE MOVE.", "A FULL SET IS NOT FASHION. IT IS A WEATHER EVENT.", "I CAN TEACH A VERSE, IF YOU HAVE KYO."] },
  { id: "holt", name: "Quartermaster Holt", role: "Stores", female: false, outfit: 3, hair: 2, map: "world", tx: 32, ty: 34, shop: "general", lines: ["POTIONS, JARS, SALT. THE WALLS DO NOT STOCK THEMSELVES.", "BRING ME SALT IF THE LEDGER ASKS. TWO PINCHES."] },
  { id: "lise", name: "Spore Broker Lise", role: "Alchemist", female: true, outfit: 4, hair: 4, map: "world", tx: 23, ty: 33, shop: "alchemy", lines: ["DREAMSPORE AND EMBERCAP. THAT IS A WARMTH TONIC.", "IRONROOT MAKES A WARD. I JUST HOLD THE FLAME."] },
  { id: "bram", name: "Fisher Bram", role: "Tide runner", female: false, outfit: 5, hair: 2, map: "world", tx: 63, ty: 34, lines: ["THE REACH IS A ROAD IF YOU RESPECT THE WATER.", "CATCH ME SOMETHING THAT DRINKS. A WATER SPIRIT.", "COOK THE FISH. RAW IS A RUMOR, NOT A MEAL."] },
  { id: "ada", name: "Sister Ada", role: "Chancel sister", female: true, outfit: 0, hair: 4, map: "world", tx: 28, ty: 26, shrine: "light", lines: ["THE CHANCEL OWES THE HUSH A WALK, NOT A SLAUGHTER.", "THE SHRINE WILL HEAL YOU, THEN IT WILL TEST YOU.", "LIGHT IS A WEAPON HERE. DO NOT APOLOGIZE FOR IT."] },
  { id: "brask", name: "Warden Brask", role: "Chancel warden", female: false, outfit: 1, hair: 0, map: "world", tx: 36, ty: 33, lines: ["I WILL WALK YOU INTO A FIGHT AND CALL IT SETTLED.", "WORLD BOSSES DO NOT WAIT ON YOUR STORY. THEY RISE ANYWAY.", "IF YOU DIE, PICK ONE THING. THE VEIL IS GREEDY, NOT THOROUGH."] },
  { id: "wren", name: "Digger Wren", role: "Barrow digger", female: true, outfit: 6, hair: 1, map: "world", tx: 40, ty: 44, lines: ["PEOPLE WENT IN FOR THE OLD PAY CHEST AND DID NOT COME OUT.", "KEEL WILL LET THEM STAY DOWN THERE. I WILL NOT.", "THE CRYPT DOOR IS SOUTH OF THE GARDEN. TWO SKELETONS, THEN THE KING."] },
  { id: "keel", name: "Priest Keel", role: "Barrow priest", female: false, outfit: 7, hair: 3, map: "world", tx: 37, ty: 42, lines: ["THE BARROW IS NOT A HOLE. IT IS A DOOR.", "IF YOU OPEN IT, YOU OWN WHAT COMES OUT.", "CATCH A LIGHT AND A FIRE BEFORE YOU CALL YOURSELF READY."] },
  { id: "pike", name: "Quiet Pike", role: "Fence", female: false, outfit: 5, hair: 1, map: "world", tx: 22, ty: 40, shop: "fence", lines: ["I BUY ROLLS. I SELL ROLLS. I DO NOT BUY STORIES.", "TYPE ON THE PIECE IS HALF THE BUILD. READ IT."] },
  { id: "nessa", name: "Peddler Nessa", role: "Ash peddler", female: true, outfit: 4, hair: 2, map: "world", tx: 22, ty: 50, shop: "armor", lines: ["THE KILN DROPS BETTER THAN I DO. I AM JUST CLOSER.", "FULL SETS CHANGE THE AIR. YOU WILL FEEL IT IN YOUR TEETH."] },
  { id: "moss", name: "Sister Moss", role: "Hollow shrine", female: true, outfit: 0, hair: 3, map: "world", tx: 42, ty: 14, shrine: "earth", lines: ["VERDANT SHRINE. EARTH ANSWERS IF YOU BLEED A LITTLE.", "THREE ROUNDS. EACH SAINT IS LOUDER."] },
  { id: "brine", name: "Cantor Brine", role: "Tide shrine", female: false, outfit: 2, hair: 2, map: "world", tx: 70, ty: 36, shrine: "water", lines: ["STAND IN THE RING. THE REACH KEEPS SCORE.", "SOAK THEM. THEN ASK THE WATER FOR MORE."] },
  { id: "sleet", name: "Warden Sleet", role: "Frost shrine", female: true, outfit: 6, hair: 4, map: "world", tx: 66, ty: 12, shrine: "ice", lines: ["THE MARCH SHRINE DOES NOT MELT FOR PLEADING.", "WHITEOUT IS A KINDNESS COMPARED TO THE BOSS OUT THERE."] },
  { id: "cinderkin", name: "Ash Cantor Vesper", role: "Kiln shrine", female: true, outfit: 4, hair: 1, map: "world", tx: 16, ty: 52, shrine: "fire", lines: ["FIRE SHRINE. YOU WILL LEAVE WITH A BURN OR A RELIC.", "THE ASH REGENT SLEEPS IN THE KILN, NOT IN THIS RING."] },
];

export type Poi =
  | { kind: "npc"; id: string }
  | { kind: "shrine"; id: string; type: TypeId; tx: number; ty: number; name: string }
  | { kind: "dungeon"; id: "crypt" | "kiln"; tx: number; ty: number; name: string }
  | { kind: "boss"; id: string; name: string; type: TypeId; template: number; tx: number; ty: number; level: number }
  | { kind: "node"; id: string; node: "ore" | "tree" | "shroom" | "fish"; tx: number; ty: number }
  | { kind: "hearth"; tx: number; ty: number };

export const POIS: Poi[] = [
  ...NPCS.map((n) => ({ kind: "npc" as const, id: n.id })),
  { kind: "shrine", id: "sh_light", type: "light", tx: 28, ty: 25, name: "Chancel Shrine" },
  { kind: "shrine", id: "sh_earth", type: "earth", tx: 44, ty: 16, name: "Hollow Shrine" },
  { kind: "shrine", id: "sh_water", type: "water", tx: 72, ty: 38, name: "Tide Shrine" },
  { kind: "shrine", id: "sh_ice", type: "ice", tx: 68, ty: 10, name: "March Shrine" },
  { kind: "shrine", id: "sh_fire", type: "fire", tx: 14, ty: 54, name: "Kiln Shrine" },
  { kind: "dungeon", id: "crypt", tx: 41, ty: 46, name: "Tiny Crypt" },
  { kind: "dungeon", id: "kiln", tx: 18, ty: 54, name: "Ash Kiln" },
  { kind: "boss", id: "tide_tyrant", name: "Tide Tyrant", type: "water", template: 5, tx: 74, ty: 30, level: 14 },
  { kind: "boss", id: "void_cantor", name: "Void Cantor", type: "void", template: 19, tx: 10, ty: 8, level: 16 },
  { kind: "boss", id: "marrow_saint", name: "Marrow Saint", type: "light", template: 24, tx: 58, ty: 8, level: 15 },
  { kind: "hearth", tx: 30, ty: 33 },
  { kind: "node", id: "ore1", node: "ore", tx: 24, ty: 36 },
  { kind: "node", id: "ore2", node: "ore", tx: 48, ty: 22 },
  { kind: "node", id: "ore3", node: "ore", tx: 12, ty: 18 },
  { kind: "node", id: "tree1", node: "tree", tx: 38, ty: 18 },
  { kind: "node", id: "tree2", node: "tree", tx: 46, ty: 12 },
  { kind: "node", id: "tree3", node: "tree", tx: 20, ty: 46 },
  { kind: "node", id: "sh1", node: "shroom", tx: 36, ty: 12 },
  { kind: "node", id: "sh2", node: "shroom", tx: 50, ty: 20 },
  { kind: "node", id: "sh3", node: "shroom", tx: 14, ty: 48 },
  { kind: "node", id: "fish1", node: "fish", tx: 60, ty: 24 },
  { kind: "node", id: "fish2", node: "fish", tx: 76, ty: 34 },
  { kind: "node", id: "fish3", node: "fish", tx: 66, ty: 40 },
];

export const STARTER_MOVES: Record<RaceId, string[]> = {
  vesper: ["lantern", "dirge", "measured", "veilstep"],
  cinder: ["wail", "ember", "measured", "pyrelunge"],
  tide: ["foam", "tide", "measured", "tidemend"],
  thorn: ["spore", "quake", "measured", "briaroll"],
  rime: ["shard", "whiteout", "measured", "icecrown"],
};

/** A fresh huntress wakes with a handful of verses. The rest live in her gear. */
export function rollInnate(rng: Rng): string[] {
  const must = ["measured", "halo", "roll"];
  const bag = MOVES.filter((m) => !must.includes(m.id));
  const out = [...must];
  while (out.length < 4 && bag.length) {
    const i = irand(rng, bag.length);
    out.push(bag.splice(i, 1)[0]!.id);
  }
  return out;
}

export function packMoves(rng: Rng, type: TypeId, n: number): string[] {
  const prefer = MOVES.filter((m) => m.type === type);
  const rest = MOVES.filter((m) => m.type !== type);
  const bag = [...prefer, ...rest];
  const out: string[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < n && bag.length && guard < 40) {
    guard += 1;
    const i = irand(rng, Math.min(bag.length, Math.max(6, prefer.length + 2)));
    const m = bag.splice(i, 1)[0];
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m.id);
  }
  return out.length ? out : ["measured"];
}

export function ensureGearMoves(g: Gear): string[] {
  if (g.moves?.length) return g.moves;
  const rng = mulberry32((g.fxSeed + 3) * 997 + g.level * 17 + g.style * 13);
  const n = g.quality === "rare" || g.quality === "epic" || g.quality === "legendary" ? 2 : 1;
  g.moves = packMoves(rng, g.type, n);
  return g.moves;
}

/** Ethereal hides shrug steel. Solid hides shrug hymns. */
export function bodyRead(type: TypeId): { kind: "magic" | "physical"; line: string } {
  const ethereal = type === "spirit" || type === "void" || type === "air" || type === "electric" || type === "light";
  if (ethereal) return { kind: "magic", line: "Ethereal hide. Magic lands cleaner than steel." };
  return { kind: "physical", line: "Solid hide. Physical cuts deeper than hymns." };
}

const COMPANION_IDS = new Set(["miret", "wren", "brask", "vey", "brine", "sleet", "ada"]);

export function npcOffers(n: NpcDef): ("Trade" | "Quest" | "Companionship")[] {
  const offers: ("Trade" | "Quest" | "Companionship")[] = [];
  if (n.shop) offers.push("Trade");
  const last = n.name.split(" ").slice(-1)[0]!.toLowerCase();
  if (n.shrine || QUESTS.some((q) => q.giver.toLowerCase().includes(last))) offers.push("Quest");
  if (COMPANION_IDS.has(n.id)) offers.push("Companionship");
  return offers;
}

export function accountNeed(level: number): number {
  return Math.floor(140 * Math.pow(1.32, Math.max(0, level - 1)));
}

export function learnPool(level: number, race: RaceId): string[] {
  const type = RACES.find((r) => r.id === race)!.type;
  const all = MOVES.filter((m) => m.power <= 22 + level * 2.2 || m.type === type || m.type === "normal");
  return all.map((m) => m.id);
}
