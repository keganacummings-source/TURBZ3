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
  | "weapon";

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
  notes: string;
  about?: string;
};

const CATEGORY_NOTES: Record<EntityCategory, string> = {
  enemy:
    "Enemy unit for combat. Place as a spawn on maps via Map Builder. Set combat stats (HP, damage, speed, range, element type). Ghost variant is the spirit form shown after defeat or in spectral modes. Supports type matchups. Export JSON to include in game content.",
  player:
    "Player model sprite. Used for character appearance in the world and hub. Draw the base sprite; future support for directional frames. Notes describe race/class or visual style.",
  npc:
    "NPC sprite and interaction. Can talk, trade, or give quests. Place near boards or taverns. Notes describe dialogue and available actions.",
  campfire:
    "Campfire interactable. Players can rest or Make Food (cook recipes) when near it. Supports survival crafting. Place on safe tiles.",
  tree:
    "Tree / wood resource. Players Interact or Chop log using Woodcutting skill to gather timber. Regenerates over time in full game. Place on verdant tiles.",
  fishing:
    "Fishing spot. Interact to Take fish using Fishing skill. Yields fish items for cooking or trade. Best placed on water-adjacent tiles.",
  mining:
    "Mining spot / ore node. Interact to mine ore using Mining skill. Yields ore or gems. Place on rocky or ashen tiles.",
  board:
    "Notice / quest board. Interact to view quests, messages, or job offers. Place near taverns or hubs. Notes can list sample quests.",
  custom:
    "Custom interactable object. Define any action such as 'Take fish', 'Make Food', 'Chop log', 'Interact', 'Open chest'. Notes explain the full behavior so designers and players know what it does. Place on any walkable tile.",
  weapon:
    "Equipment weapon. Provides combat stats when equipped. Pixel art for inventory and held appearance. Element type for matchups.",
};

export const CATEGORY_LABELS: Record<EntityCategory, string> = {
  enemy: "Enemy (+ Ghost)",
  player: "Player Model",
  npc: "NPC",
  campfire: "Campfire",
  tree: "Tree",
  fishing: "Fishing Spot",
  mining: "Mining Spot",
  board: "Board",
  custom: "Custom Interactable",
  weapon: "Weapon",
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
    // simple body
    for (let y = 4; y < 12; y++) for (let x = 6; x <= 9; x++) base.pixels[y * 16 + x] = "#8d72a8";
  } else if (category === "weapon") {
    base.type = "normal";
    base.damage = 12;
    base.speed = 1;
    base.range = 48;
  } else if (category === "tree") {
    base.action = "Chop log";
    base.skill = "woodcutting";
    base.yield = "timber";
    for (let y = 2; y < 10; y++) for (let x = 5; x <= 10; x++) base.pixels[y * 16 + x] = "#3a5a2a";
    for (let y = 10; y < 15; y++) base.pixels[y * 16 + 8] = "#6a4a30";
  } else if (category === "fishing") {
    base.action = "Take fish";
    base.skill = "fishing";
    base.yield = "fish";
  } else if (category === "mining") {
    base.action = "Mine ore";
    base.skill = "mining";
    base.yield = "ore";
  } else if (category === "campfire") {
    base.action = "Make Food";
    base.skill = "none";
  } else if (category === "board") {
    base.action = "Interact";
  } else if (category === "custom") {
    base.action = "Interact";
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
    notes: (e.notes || defaultNotes(e.category)).trim(),
    about: e.about?.trim(),
  };
}
