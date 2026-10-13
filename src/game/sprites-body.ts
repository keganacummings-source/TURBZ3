import type { FxId, GhostLook, RaceId, TypeId } from "./content";
import { TYPES } from "./content";

export type Pal = { d: string; m: string; l: string; h: string; a: string };

export function typePal(t: TypeId): Pal {
  const c = TYPES[t].color;
  const n = parseInt(c.slice(1), 16);
  const ch = (i: number, amt: number) => Math.max(0, Math.min(255, ((n >> i) & 255) + amt));
  const shade = (amt: number) => `#${[16, 8, 0].map((i) => ch(i, amt).toString(16).padStart(2, "0")).join("")}`;
  return { d: shade(-70), m: shade(-25), l: c, h: "#fff6e8", a: shade(40) };
}

export type ActorDraw = {
  x: number;
  y: number;
  race: RaceId;
  female: boolean;
  hair: number;
  skin: number;
  facing: number;
  walk: number;
  attack: number;
  hurt: number;
  tall?: number;
  pieces: { slot: string; style: number; type: TypeId; fxSeed: number; quality: number; packPath?: string; packKind?: string; packSlot?: string }[];
  setFx: FxId | null;
  setOn: boolean;
  scale?: number;
  ghost?: boolean;
  time?: number;
  usePack?: boolean;
  packGear?: import("./content").Gear[];
  moving?: boolean;
  running?: boolean;
  airborne?: boolean;
};

export type MonsterDraw = {
  x: number;
  y: number;
  template: number;
  type: TypeId;
  facing: number;
  walk: number;
  hurt: number;
  boss: boolean;
  rarity: number;
  ghost?: boolean;
  animal?: boolean;
  species?: string;
  look?: GhostLook | null;
  time?: number;
};

const SKIN = ["#c48a78", "#d09878", "#c4a090", "#c89878", "#e0c8d0"];

/** Procedural fallback when CharacterPack is not ready. */
export function drawActorProcedural(ctx: CanvasRenderingContext2D, a: ActorDraw): void {
  const s = (a.scale ?? 1) * (a.tall ?? 1);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.scale(a.facing < 0 ? -s : s, s);
  const bob = Math.sin(a.walk * 8) * (a.walk > 0.2 ? 1.2 : 0.25);
  ctx.translate(0, bob);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SKIN[a.skin] ?? SKIN[0]!;
  ctx.beginPath();
  ctx.ellipse(0, -14, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1840";
  ctx.fillRect(-8, -10, 16, 14);
  if (a.hurt > 0) {
    ctx.globalAlpha = a.hurt * 0.5;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-8, -22, 16, 24);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawMonster(ctx: CanvasRenderingContext2D, m: MonsterDraw): void {
  const pal = typePal(m.type);
  const s = m.boss ? 1.35 : 1;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(m.facing < 0 ? -s : s, s);
  const bob = Math.sin(m.walk * 6) * 1.2;
  ctx.translate(0, bob);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.m;
  ctx.beginPath();
  ctx.ellipse(0, -12, m.boss ? 14 : 10, m.boss ? 16 : 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.l;
  ctx.beginPath();
  ctx.ellipse(-3, -16, 2, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -16, 2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (m.hurt > 0) {
    ctx.globalAlpha = m.hurt * 0.45;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-12, -28, 24, 28);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawShadowName(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.font = "12px VT323, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#140e0c";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color || "#fff6e8";
  ctx.fillText(text, x, y);
}

export function drawSetAura(ctx: CanvasRenderingContext2D, x: number, y: number, fx: FxId, t: number, scale = 1): void {
  const c = fxColor(fx);
  ctx.save();
  ctx.globalAlpha = 0.25 + Math.sin(t * 3) * 0.08;
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 20 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function fxColor(fx: FxId | string): string {
  const map: Record<string, string> = {
    gravepulse: "#b4a6ff",
    ember: "#e07050",
    tide: "#7ec8ea",
    frost: "#b9dcff",
    thorn: "#6a9a52",
  };
  return map[String(fx)] ?? "#b4a6ff";
}
