/** Weapon schools for mastery skills and pack gear tagging. */

export type WeaponKindId =
  | "blade"
  | "bow"
  | "crossbow"
  | "axe"
  | "staff"
  | "tome"
  | "sling"
  | "claw"
  | "spear"
  | "mace"
  | "dagger"
  | "shield";

export const WEAPON_MASTERY_SKILLS: { id: string; name: string; about: string }[] = [
  { id: "w_blade", name: "Blade Mastery", about: "Swords and sabers" },
  { id: "w_bow", name: "Bow Mastery", about: "Longbows and shortbows" },
  { id: "w_crossbow", name: "Crossbow Mastery", about: "Bolts and arbalests" },
  { id: "w_axe", name: "Axe Mastery", about: "Axes and cleavers" },
  { id: "w_staff", name: "Staff Mastery", about: "Staves and rods" },
  { id: "w_tome", name: "Tome Mastery", about: "Books and grimoires" },
  { id: "w_sling", name: "Sling Mastery", about: "Slings and stones" },
  { id: "w_claw", name: "Claw Mastery", about: "Claws and gauntlets" },
  { id: "w_spear", name: "Spear Mastery", about: "Spears and pikes" },
  { id: "w_mace", name: "Mace Mastery", about: "Maces and hammers" },
  { id: "w_dagger", name: "Dagger Mastery", about: "Knives and dirks" },
  { id: "w_shield", name: "Shield Mastery", about: "Shields and bucklers" },
];

export const WEAPON_KIND_TO_SKILL: Record<WeaponKindId, string> = {
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

export function weaponKindFromName(name: string): WeaponKindId {
  const n = name.toLowerCase();
  if (/crossbow|arbalest/.test(n)) return "crossbow";
  if (/bow|longbow|shortbow/.test(n)) return "bow";
  if (/axe|hatchet|cleaver/.test(n)) return "axe";
  if (/staff|stave|rod|wand/.test(n)) return "staff";
  if (/tome|book|grimoire/.test(n)) return "tome";
  if (/sling/.test(n)) return "sling";
  if (/claw|fist|gauntlet/.test(n)) return "claw";
  if (/spear|lance|pike|pole/.test(n)) return "spear";
  if (/mace|hammer|club|flail/.test(n)) return "mace";
  if (/dagger|knife|dirk/.test(n)) return "dagger";
  if (/shield|buckler/.test(n)) return "shield";
  if (/blade|sword|saber|rapier|scimitar/.test(n)) return "blade";
  return "blade";
}

export function weaponMasteryLine(id: string, level: number): string | null {
  const n = Math.max(0, level - 1);
  switch (id) {
    case "w_blade":
      return `+${(n * 1.5).toFixed(0)}% blade damage · +${(n * 0.5).toFixed(0)}% parry`;
    case "w_bow":
      return `+${(n * 1.5).toFixed(0)}% bow damage · +${(n * 0.8).toFixed(0)}% range`;
    case "w_crossbow":
      return `+${(n * 1.8).toFixed(0)}% bolt damage · pierce chance`;
    case "w_axe":
      return `+${(n * 1.6).toFixed(0)}% axe damage · +cleave`;
    case "w_staff":
      return `+${(n * 1.4).toFixed(0)}% staff damage · +${(n * 1).toFixed(0)}% spell power`;
    case "w_tome":
      return `+${(n * 1.5).toFixed(0)}% tome damage · +ward strength`;
    case "w_sling":
      return `+${(n * 1.2).toFixed(0)}% sling damage · +stun chance`;
    case "w_claw":
      return `+${(n * 1.3).toFixed(0)}% claw damage · +bleed`;
    case "w_spear":
      return `+${(n * 1.4).toFixed(0)}% spear damage · +reach`;
    case "w_mace":
      return `+${(n * 1.6).toFixed(0)}% mace damage · +armor crack`;
    case "w_dagger":
      return `+${(n * 1.5).toFixed(0)}% dagger damage · +crit`;
    case "w_shield":
      return `+${(n * 1.2).toFixed(0)}% block · +${(n * 0.8).toFixed(0)}% reflect`;
    default:
      return null;
  }
}
