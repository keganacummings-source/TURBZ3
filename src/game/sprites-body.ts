import type { FxId, GhostLook, RaceId, TypeId } from "./content";
import { TYPES } from "./content";
import { motifOf, paintMotif, paintSetAura } from "./fx-paint";

// NOTE: Full file is large; if this is truncated the build will fail.
// Temporary minimal procedural fallback so the CharacterPack path can load.

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

const SKIN = ["#c48a78", "#d09878", "#c4a090", "#c89878", "#e0c8d0"];

/** Minimal procedural fallback when CharacterPack image is not ready. */
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

export function drawMonster(ctx: CanvasRenderingContext2D, ..._args: unknown[]): void {
  /* optional stub — full body lives in repo history if needed */
}

export function drawShadowName(ctx: CanvasRenderingContext2D, name: string, x: number, y: number): void {
  ctx.font = "12px VT323, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#140e0c";
  ctx.fillText(name, x + 1, y + 1);
  ctx.fillStyle = "#fff6e8";
  ctx.fillText(name, x, y);
}

export function drawSetAura(ctx: CanvasRenderingContext2D, ..._args: unknown[]): void {}

export function fxColor(_id: FxId | string): string {
  return "#b4a6ff";
}
