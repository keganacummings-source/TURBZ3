import { useCallback, useEffect, useRef, useState } from "react";
import {
  FLOOR_COLOR,
  downloadMapFile,
  emptyMap,
  parseMapJson,
  type MapFile,
  type MapTile,
} from "@/game/map-format";
import {
  loadTileCatalog,
  preloadCategory,
  tileImage,
  type AtlasCategory,
  type AtlasTile,
  type TileCatalog,
} from "@/game/tile-atlas";

const TOOLS = [
  { id: "paint", label: "Paint" },
  { id: "fill", label: "Fill" },
  { id: "rect", label: "Rect" },
  { id: "erase", label: "Erase" },
  { id: "spawn", label: "Spawn" },
] as const;
type ToolId = (typeof TOOLS)[number]["id"];

function idx(x: number, y: number, w: number) {
  return y * w + x;
}
function cloneMap(m: MapFile): MapFile {
  return {
    ...m,
    tiles: m.tiles.map((t) => ({ ...t })),
    spawns: m.spawns ? m.spawns.map((s) => ({ ...s })) : [],
    spawn: m.spawn ? { ...m.spawn } : undefined,
  };
}
function physicsFromAtlas(tile: AtlasTile | null): Pick<MapTile, "floor" | "block"> {
  if (!tile) return { floor: 0, block: 0 };
  if (tile.solid) return { floor: 1, block: 1 };
  if (tile.slow < 1) return { floor: 2, block: 0 };
  return { floor: 0, block: 0 };
}

export function MapBuilder({ onBack }: { onBack: () => void }) {
  const [map, setMap] = useState<MapFile>(() => emptyMap("room", "New Room", 32, 24));
  const [tool, setTool] = useState<ToolId>("paint");
  const [catalog, setCatalog] = useState<TileCatalog | null>(null);
  const [catId, setCatId] = useState("");
  const [brush, setBrush] = useState<AtlasTile | null>(null);
  const [forceSolid, setForceSolid] = useState(false);
  const [zoom, setZoom] = useState(16);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [status, setStatus] = useState("Loading MapAssets catalog…");
  const [tick, setTick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadTileCatalog().then((c) => {
      setCatalog(c);
      if (c?.categories[0]) {
        setCatId(c.categories[0].id);
        preloadCategory(c.categories[0]);
        setBrush(c.categories[0].tiles[0] ?? null);
        setStatus(`Loaded ${c.categories.reduce((n, x) => n + x.count, 0)} tiles from MapAssets.`);
      } else setStatus("No MapAssets/catalog.json \u2014 using color floors only.");
    });
  }, []);

  const activeCat: AtlasCategory | null =
    catalog?.categories.find((c) => c.id === catId) ?? catalog?.categories[0] ?? null;

  useEffect(() => {
    if (activeCat) preloadCategory(activeCat);
  }, [activeCat]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 400);
    return () => window.clearInterval(id);
  }, []);

  const paintCell = useCallback(
    (m: MapFile, x: number, y: number) => {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
      const t = m.tiles[idx(x, y, m.w)]!;
      if (tool === "erase") {
        t.floor = 0;
        t.block = 0;
        t.decor = 0;
        t.sprite = undefined;
        return;
      }
      if (tool === "spawn") {
        m.spawn = { tx: x, ty: y };
        return;
      }
      if (brush) {
        const phys = physicsFromAtlas(brush);
        t.sprite = brush.path;
        t.floor = phys.floor;
        t.block = forceSolid || phys.block ? 1 : 0;
        t.decor = 0;
      } else {
        t.floor = 0;
        t.block = forceSolid ? 1 : 0;
        t.sprite = undefined;
      }
    },
    [tool, brush, forceSolid],
  );

  const floodFill = useCallback(
    (m: MapFile, sx: number, sy: number) => {
      const start = m.tiles[idx(sx, sy, m.w)]!;
      const targetSprite = start.sprite;
      const targetFloor = start.floor;
      const q: [number, number][] = [[sx, sy]];
      const seen = new Set<number>();
      while (q.length) {
        const [x, y] = q.pop()!;
        const i = idx(x, y, m.w);
        if (seen.has(i)) continue;
        seen.add(i);
        const t = m.tiles[i]!;
        if ((t.sprite ?? "") !== (targetSprite ?? "") || t.floor !== targetFloor) continue;
        paintCell(m, x, y);
        if (x > 0) q.push([x - 1, y]);
        if (x < m.w - 1) q.push([x + 1, y]);
        if (y > 0) q.push([x, y - 1]);
        if (y < m.h - 1) q.push([x, y + 1]);
      }
    },
    [paintCell],
  );

  const applyAt = useCallback(
    (x: number, y: number, rectOrigin?: { x0: number; y0: number }) => {
      setMap((prev) => {
        const m = cloneMap(prev);
        if (tool === "fill") floodFill(m, x, y);
        else if (tool === "rect" && rectOrigin) {
          const x0 = Math.min(rectOrigin.x0, x);
          const x1 = Math.max(rectOrigin.x0, x);
          const y0 = Math.min(rectOrigin.y0, y);
          const y1 = Math.max(rectOrigin.y0, y);
          for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) paintCell(m, xx, yy);
        } else paintCell(m, x, y);
        return m;
      });
    },
    [tool, paintCell, floodFill],
  );

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const cell = zoom;
    c.width = map.w * cell;
    c.height = map.h * cell;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.tiles[idx(x, y, map.w)]!;
        let drawn = false;
        if (t.sprite) {
          const img = tileImage(t.sprite);
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, x * cell, y * cell, cell, cell);
            drawn = true;
          }
        }
        if (!drawn) {
          ctx.fillStyle = FLOOR_COLOR[t.floor] ?? "#444";
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
        if (t.block) {
          ctx.strokeStyle = "rgba(255,60,80,0.7)";
          ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
        }
      }
    }
    if (map.spawn) {
      ctx.fillStyle = "#ffe66a";
      ctx.beginPath();
      ctx.arc(map.spawn.tx * cell + cell / 2, map.spawn.ty * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    if (drag && tool === "rect") {
      const x0 = Math.min(drag.x0, drag.x1);
      const x1 = Math.max(drag.x0, drag.x1);
      const y0 = Math.min(drag.y0, drag.y1);
      const y1 = Math.max(drag.y0, drag.y1);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 * cell, y0 * cell, (x1 - x0 + 1) * cell, (y1 - y0 + 1) * cell);
    }
  }, [map, zoom, drag, tool, tick]);

  function cellFromEvent(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * map.w),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * map.h),
    };
  }

  function newBlank(kind: "room" | "dungeon" | "arena" | "world") {
    const sizes = { room: [24, 18], dungeon: [40, 28], arena: [28, 20], world: [84, 60] } as const;
    const [w, h] = sizes[kind];
    const id = kind === "world" ? "main" : kind;
    setMap(emptyMap(id, kind === "world" ? "Main World" : `New ${kind}`, w, h));
    setStatus(`New ${kind} (${w}\u00d7${h}). Paint from MapAssets, then Download.`);
  }

  function onUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseMapJson(JSON.parse(String(reader.result)));
        setMap(parsed);
        setStatus(`Loaded ${parsed.name} (${parsed.w}\u00d7${parsed.h}).`);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Bad map file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex h-full justify-center overflow-auto p-3 pb-24">
      <div className="px-panel my-auto w-full max-w-6xl p-4">
        <p className="font-display text-xs text-blood">LETS BUILD</p>
        <h2 className="font-display mt-2 text-sm text-bone">Map Builder</h2>
        <p className="mt-2 text-dim text-sm">
          Tiles from <code className="text-kyo">MapAssets</code>. Download JSON into{" "}
          <code className="text-kyo">public/Maps/</code> \u2014 use <code className="text-kyo">main.json</code> for the overworld.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="px-btn" type="button" onClick={() => newBlank("room")}>New room</button>
          <button className="px-btn" type="button" onClick={() => newBlank("dungeon")}>New dungeon</button>
          <button className="px-btn" type="button" onClick={() => newBlank("arena")}>New arena</button>
          <button className="px-btn" type="button" onClick={() => newBlank("world")}>New world (main)</button>
          <button className="px-btn" type="button" onClick={() => fileRef.current?.click()}>Upload / edit</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          <button className="px-btn px-btn-kyo" type="button" onClick={() => { downloadMapFile(map); setStatus(`Downloaded ${map.id}.json`); }}>
            Download map
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-dim text-sm">Map id
            <input className="mt-1 w-full rounded border border-black/40 bg-black/30 px-2 py-1 text-bone"
              value={map.id} onChange={(e) => setMap((m) => ({ ...m, id: e.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase() }))} />
          </label>
          <label className="text-dim text-sm">Name
            <input className="mt-1 w-full rounded border border-black/40 bg-black/30 px-2 py-1 text-bone"
              value={map.name} onChange={(e) => setMap((m) => ({ ...m, name: e.target.value }))} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {TOOLS.map((t) => (
            <button key={t.id} type="button" className={`px-btn ${tool === t.id ? "px-btn-kyo" : ""}`} onClick={() => setTool(t.id)}>
              {t.label}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1 text-dim text-sm">
            Zoom <input type="range" min={10} max={28} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>
          <label className="flex items-center gap-1 text-dim text-sm">
            <input type="checkbox" checked={forceSolid} onChange={(e) => setForceSolid(e.target.checked)} /> Force solid
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1 max-h-20 overflow-auto">
          {catalog?.categories.map((c) => (
            <button key={c.id} type="button" className={`px-btn text-xs ${catId === c.id ? "px-btn-kyo" : ""}`} onClick={() => setCatId(c.id)}>
              {c.label} ({c.count})
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1 max-h-40 overflow-auto rounded border border-black/40 bg-black/40 p-2">
          {(activeCat?.tiles ?? []).map((t) => (
            <button key={t.id} type="button" title={t.file}
              className={`h-9 w-9 overflow-hidden rounded border ${brush?.id === t.id ? "border-kyo ring-1 ring-kyo" : "border-black/50"}`}
              onClick={() => setBrush(t)}>
              <img src={t.path} alt={t.file} className="h-full w-full object-cover" style={{ imageRendering: "pixelated" }} />
            </button>
          ))}
        </div>
        <p className="mt-1 text-dim text-xs">
          Brush: {brush ? `${brush.category}/${brush.file}${brush.solid ? " \u00b7 solid" : ""}${brush.slow < 1 ? " \u00b7 slow" : ""}` : "none"}
        </p>
        <div className="mt-3 overflow-auto rounded border border-black/40 bg-black/30 p-2">
          <canvas ref={canvasRef} className="cursor-crosshair max-w-full"
            onMouseDown={(e) => {
              const { x, y } = cellFromEvent(e);
              if (tool === "rect") setDrag({ x0: x, y0: y, x1: x, y1: y });
              else applyAt(x, y);
            }}
            onMouseMove={(e) => {
              const { x, y } = cellFromEvent(e);
              if (drag && tool === "rect") setDrag((d) => (d ? { ...d, x1: x, y1: y } : d));
              else if (e.buttons === 1 && (tool === "paint" || tool === "erase")) applyAt(x, y);
            }}
            onMouseUp={(e) => {
              if (drag && tool === "rect") {
                const { x, y } = cellFromEvent(e);
                applyAt(x, y, { x0: drag.x0, y0: drag.y0 });
                setDrag(null);
              }
            }}
            onMouseLeave={() => setDrag(null)}
          />
        </div>
        <p className="mt-2 text-dim text-sm">{status}</p>
        <p className="mt-1 text-dim text-xs">Water slows movement. Walls / force-solid block walking. Yellow = spawn.</p>
        <button className="px-btn mt-4" type="button" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}
