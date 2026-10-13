export type Campfire = { map: string; x: number; y: number };
export type SurvivalState = { hunger: number; thirst: number; rest: number; elapsed: number; campfires: Campfire[] };
const bounded = (n: unknown, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
export function normalizeSurvival(raw?: Partial<SurvivalState>): SurvivalState {
  return { hunger: bounded(raw?.hunger, 100), thirst: bounded(raw?.thirst, 100), rest: bounded(raw?.rest, 100), elapsed: Number.isFinite(raw?.elapsed) ? Math.max(0, raw!.elapsed!) : 0,
    campfires: (Array.isArray(raw?.campfires) ? raw.campfires : []).filter(c => c && typeof c.map === 'string' && Number.isFinite(c.x) && Number.isFinite(c.y) && c.x >= 0 && c.y >= 0).slice(-100) };
}
// Full reserves last 30 / 20 / 40 minutes of active play. Empty reserves cause injury.
export function advanceSurvival(s: SurvivalState, dt: number, sleeping = false): number {
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  const emptyTime = (value: number, rate: number) => Math.max(0, dt - value / rate);
  const damage = emptyTime(s.hunger, 100 / 1800) * .4 + emptyTime(s.thirst, 100 / 1200) * .8 + (sleeping ? 0 : emptyTime(s.rest, 100 / 2400) * .2);
  s.hunger = Math.max(0, s.hunger - dt * 100 / 1800);
  s.thirst = Math.max(0, s.thirst - dt * 100 / 1200);
  s.rest = sleeping ? Math.min(100, s.rest + dt * 8) : Math.max(0, s.rest - dt * 100 / 2400);
  s.elapsed += dt;
  return damage;
}
export const CAMP_RECIPES: Record<string, { costs: Record<string, number>; item: string; amount: number }> = {
  cook: { costs: { meat: 1, timber: 1 }, item: 'cooked_meat', amount: 1 },
  fish: { costs: { fish: 1, timber: 1 }, item: 'fish_meal', amount: 1 },
  purify: { costs: { raw_water: 1, timber: 1 }, item: 'drinking_water', amount: 1 },
};
export function consumeMaterials(bag: Record<string, number>, costs: Record<string, number>): boolean {
  if (Object.entries(costs).some(([id, n]) => !Number.isFinite(bag[id]) || bag[id]! < n)) return false;
  for (const [id, n] of Object.entries(costs)) bag[id] -= n;
  return true;
}
export function craftAtCamp(bag: Record<string, number>, recipe: string, nearFire: boolean): boolean {
  const r = CAMP_RECIPES[recipe];
  if (!nearFire || !r || !consumeMaterials(bag, r.costs)) return false;
  bag[r.item] = (bag[r.item] ?? 0) + r.amount;
  return true;
}
export function waterWithinReach(world: { w: number; h: number; tiles: { floor: number }[] }, x: number, y: number): boolean {
  const tx = Math.floor(x / 32), ty = Math.floor(y / 32);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = tx + dx, yy = ty + dy;
    if (xx >= 0 && yy >= 0 && xx < world.w && yy < world.h && world.tiles[yy * world.w + xx]?.floor === 2 && Math.hypot(xx * 32 + 16 - x, yy * 32 + 16 - y) <= 80) return true;
  }
  return false;
}
export const FOOD: Record<string, number> = { trail_ration: 35, cooked_meat: 50, fish_meal: 40, mushroom: 8 };
