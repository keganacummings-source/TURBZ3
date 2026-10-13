import { TYPES, type TypeId } from "./content";

export type EntityCategory =
  | "enemy"
  | "player"
  | "npc"
  | "campfire"
  | "tree"
  | "fishing"
  | "mining"
  | "board"
  | "custom"
  | "weapon"
  | "armor"
  | "resource"
  | "crafting"
  | "recipe"
  | "consumable"
  | "equipable";

export type EntityDesign = {
  version: 1;
  id: string;
  name: string;
  category: EntityCategory;
  type?: TypeId;
  pixels: (string | null)[];
  ghostPixels?: (string | null)[];
  hp?: number;
  damage?: number;
  speed?: number;
  range?: number;
  action?: string;
  skill?: string;
  yield?: string;
  armor?: number;
  recipeInputs?: string;
  recipeOutput?: string;
  equipSlot?: "head" | "chest" | "legs" | "feet" | "relic" | "weapon" | "none";
  notes: string;
  about?: string;
};

export const ENTITY_ACTIONS: { id: string; label: string; about: string }[] = [
  { id: "interact", label: "Interact", about: "Generic talk / inspect" },
  { id: "chop", label: "Chop log", about: "Woodcutting — gather timber" },
  { id: "mine", label: "Mine ore", about: "Mining — gather ore / gems" },
  { id: "fish", label: "Take fish", about: "Fishing — gather fish (also press F at any water tile)" },
  { id: "cook", label: "Make Food", about: "Cook at campfire" },
  { id: "purify", label: "Purify water", about: "Turn raw water into drinking water" },
  { id: "rest", label: "Rest / Sleep", about: "Recover rest meter at camp" },
  { id: "open_chest", label: "Open chest", about: "Loot container" },
  { id: "pickup", label: "Pick up", about: "Add resource to bag" },
  { id: "craft", label: "Craft", about: "Consume recipe inputs, grant output" },
  { id: "equip", label: "Equip", about: "Wear armor or wield weapon (stats only; no body overlay)" },
  { id: "use", label: "Use item", about: "Consumable — heal, buff, jar, etc." },
  { id: "trade", label: "Trade", about: "Open shop / barter" },
  { id: "quest", label: "Quest board", about: "Read / accept quests" },
  { id: "attack", label: "Hostile", about: "Enemy combatant" },
  { id: "talk", label: "Talk", about: "NPC dialogue" },
];

const CATEGORY_NOTES: Record<EntityCategory, string> = {
  enemy: "Enemy unit for combat. Set combat stats. Ghost variant for spirit form.",
  player: "Player model sprite for character appearance.",
  npc: "NPC sprite and interaction.",
  campfire: "Campfire interactable for rest and cooking.",
  tree: "Tree / wood resource. Chop for timber.",
  fishing: "Fishing spot. Take fish (or press F at any water tile in-game).",
  mining: "Mining spot / ore node.",
  board: "Notice / quest board.",
  custom: "Custom interactable. Pick an action from the full action list.",
  weapon: "Equipment weapon. Equippable for stats; no body overlay.",
  armor: "Armor piece. Equippable for armor stats; no body overlay.",
  resource: "Gatherable resource node or bag item.",
  crafting: "Crafting station.",
  recipe: "Crafting recipe definition.",
  consumable: "Usable bag item.",
  equipable: "Generic equipable. Choose equipSlot.",
};

export const CATEGORY_LABELS: Record<EntityCategory, string> = {
  enemy: "Enemy (+ Ghost)",
  player: "Player Model",
  npc: "NPC",
  campfire: "Campfire",
  tree: "Tree / Wood",
  fishing: "Fishing Spot",
  mining: "Mining Spot",
  board: "Quest Board",
  custom: "Custom Interactable",
  weapon: "Weapon (equip, no body overlay)",
  armor: "Armor (equip, no body overlay)",
  resource: "Resource / Node",
  crafting: "Crafting Station",
  recipe: "Crafting Recipe",
  consumable: "Consumable Item",
  equipable: "Generic Equipable",
};

function emptyPixels(): (string | null)[] {
  return Array(256).fill(null);
}

export function defaultNotes(category: EntityCategory): string {
  return CATEGORY_NOTES[category];
}

export function newEntityDesign(category: EntityCategory = "enemy"): EntityDesign {
  const base: EntityDesign = {
    version: 1,
    id: `new-${category}`,
    name: category === "enemy" ? "New Enemy" : category === "tree" ? "Oak Tree" : "New Object",
    category,
    pixels: emptyPixels(),
    notes: defaultNotes(category),
    about: "",
  };
  if (category === "enemy") {
    base.type = "normal";
    base.hp = 40;
    base.damage = 8;
    base.speed = 1;
    base.range = 48;
    base.ghostPixels = emptyPixels();
    for (let y = 4; y < 12; y++) for (let x = 6; x <= 9; x++) base.pixels[y * 16 + x] = "#8d72a8";
  } else if (category === "weapon") {
    base.type = "normal";
    base.damage = 12;
    base.speed = 1;
    base.range = 48;
    base.equipSlot = "weapon";
    base.action = "equip";
  } else if (category === "tree") {
    base.action = "chop";
    base.skill = "woodcutting";
    base.yield = "timber";
  } else if (category === "fishing") {
    base.action = "fish";
    base.skill = "fishing";
    base.yield = "fish";
  } else if (category === "mining") {
    base.action = "mine";
    base.skill = "mining";
    base.yield = "ore";
  } else if (category === "campfire") {
    base.action = "cook";
  } else if (category === "board") {
    base.action = "quest";
  } else if (category === "custom") {
    base.action = "interact";
  } else if (category === "armor") {
    base.type = "normal";
    base.armor = 8;
    base.equipSlot = "chest";
    base.action = "equip";
  } else if (category === "resource") {
    base.action = "pickup";
    base.yield = "timber";
  } else if (category === "crafting") {
    base.action = "craft";
  } else if (category === "recipe") {
    base.action = "craft";
    base.recipeInputs = "timber:2,meat:1";
    base.recipeOutput = "cooked_meat";
  } else if (category === "consumable") {
    base.action = "use";
  } else if (category === "equipable") {
    base.action = "equip";
    base.equipSlot = "relic";
    base.armor = 2;
  }
  return base;
}

export function parseEntityDesign(raw: unknown): EntityDesign {
  const e = raw as Partial<EntityDesign>;
  if (
    !e ||
    e.version !== 1 ||
    typeof e.id !== "string" ||
    !/^[a-z0-9_-]{1,80}$/i.test(e.id) ||
    typeof e.name !== "string" ||
    !e.name.trim() ||
    e.name.length > 100 ||
    !e.category ||
    !Object.hasOwn(CATEGORY_LABELS, e.category)
  )
    throw Error("Invalid entity identity or category.");
  if (
    !Array.isArray(e.pixels) ||
    e.pixels.length !== 256 ||
    e.pixels.some((p) => p !== null && (typeof p !== "string" || !/^#[0-9a-f]{6}$/i.test(p)))
  )
    throw Error("Main sprite needs 256 pixels, each transparent or a hex color.");
  if (
    e.ghostPixels &&
    (!Array.isArray(e.ghostPixels) ||
      e.ghostPixels.length !== 256 ||
      e.ghostPixels.some((p) => p !== null && (typeof p !== "string" || !/^#[0-9a-f]{6}$/i.test(p))))
  )
    throw Error("Ghost sprite needs 256 pixels or be omitted.");
  if (e.type && !Object.hasOwn(TYPES, e.type)) throw Error("Invalid element type.");
  if (e.hp !== undefined && (!Number.isFinite(e.hp) || e.hp < 1 || e.hp > 9999))
    throw Error("HP must be 1–9999.");
  if (e.damage !== undefined && (!Number.isFinite(e.damage) || e.damage < 0 || e.damage > 500))
    throw Error("Damage must be 0–500.");
  if (e.speed !== undefined && (!Number.isFinite(e.speed) || e.speed < 0.1 || e.speed > 5))
    throw Error("Speed must be 0.1–5.");
  if (e.range !== undefined && (!Number.isFinite(e.range) || e.range < 8 || e.range > 500))
    throw Error("Range must be 8–500.");
  if (e.notes && (typeof e.notes !== "string" || e.notes.length > 2000))
    throw Error("Notes too long (max 2000 characters).");
  if (e.about && (typeof e.about !== "string" || e.about.length > 500))
    throw Error("About text too long.");
  if (e.action && (typeof e.action !== "string" || e.action.length > 80))
    throw Error("Action text too long.");
  return {
    version: 1,
    id: e.id,
    name: e.name.trim(),
    category: e.category,
    type: e.type,
    pixels: [...e.pixels],
    ghostPixels: e.ghostPixels ? [...e.ghostPixels] : undefined,
    hp: e.hp,
    damage: e.damage,
    speed: e.speed,
    range: e.range,
    action: e.action?.trim(),
    skill: e.skill?.trim(),
    yield: e.yield?.trim(),
    armor: typeof e.armor === "number" && Number.isFinite(e.armor) ? e.armor : undefined,
    recipeInputs: e.recipeInputs?.trim(),
    recipeOutput: e.recipeOutput?.trim(),
    equipSlot: e.equipSlot,
    notes: (e.notes || defaultNotes(e.category)).trim(),
    about: e.about?.trim(),
  };
}
