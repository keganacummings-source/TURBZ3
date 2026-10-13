/** Weapon + elemental mastery skills (grind by using that weapon / type). */
import type { TypeId } from "./content";
import { WEAPON_MASTERY_SKILLS, type WeaponKindId, WEAPON_KIND_TO_SKILL } from "./weapon-kind";

export const TYPE_MASTERY_SKILLS: { id: string; name: string; about: string; type: TypeId }[] = [
  { id: "t_normal", name: "Normal Affinity", about: "Unaligned strikes", type: "normal" },
  { id: "t_fire", name: "Fire Affinity", about: "Flame verses", type: "fire" },
  { id: "t_water", name: "Water Affinity", about: "Tide verses", type: "water" },
  { id: "t_earth", name: "Earth Affinity", about: "Stone verses", type: "earth" },
  { id: "t_air", name: "Air Affinity", about: "Gale verses", type: "air" },
  { id: "t_electric", name: "Electric Affinity", about: "Storm verses", type: "electric" },
  { id: "t_ice", name: "Ice Affinity", about: "Frost verses", type: "ice" },
  { id: "t_void", name: "Void Affinity", about: "Null verses", type: "void" },
  { id: "t_light", name: "Light Affinity", about: "Radiant verses", type: "light" },
  { id: "t_spirit", name: "Spirit Affinity", about: "Soul verses", type: "spirit" },
  { id: "t_ghoul", name: "Ghoul Affinity", about: "Grave verses", type: "ghoul" },
];

export const ALL_MASTERY_SKILL_IDS: string[] = [
  ...WEAPON_MASTERY_SKILLS.map((s) => s.id),
  ...TYPE_MASTERY_SKILLS.map((s) => s.id),
];

export function typeSkillId(type: string): string {
  return `t_${type}`;
}

export function weaponSkillId(kind: WeaponKindId | string | undefined): string | null {
  if (!kind) return null;
  return WEAPON_KIND_TO_SKILL[kind as WeaponKindId] ?? null;
}

export function masterySkillLine(id: string, level: number): string {
  const n = Math.max(0, level - 1);
  if (id.startsWith("w_")) {
    return `+${(n * 1.5).toFixed(1)}% damage with this weapon school`;
  }
  if (id.startsWith("t_")) {
    return `+${(n * 1.8).toFixed(1)}% damage with this type`;
  }
  return "";
}

export { WEAPON_MASTERY_SKILLS };
