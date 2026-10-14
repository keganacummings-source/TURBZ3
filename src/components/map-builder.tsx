import { useEffect, useRef, useState } from "react";
import { ANIMALS, MONSTERS, TILE } from "@/game/content";
import {
  downloadMapFile,
  emptyMap,
  FLOOR_COLOR,
  parseMapJson,
  type MapFile,
  type SpawnZone,
  type ZoneType,
} from "@/game/map-format";
import { loadTileCatalog, tileImage, type AtlasTile, type TileCatalog } from "@/game/tile-atlas";

const KEY = "turbz-designer-maps-v1";
type Tool = "pan" | "paint" | "erase" | "wall" | "start" | "enemy" | "boss" | "zone" | "remove";
const ZONE_LABEL: Record<ZoneType, string> = {
  enemy: "Enemy",
  boss: "Boss",
  mixed: "Mixed enemies",
  ore: "Ore nodes",
  tree: "Tree nodes",
  shroom: "Mushroom nodes",
};
export function MapBuilder({ onBack }: { onBack: () => void }) {
  const [map, setMap] = useState(() => ({
    ...emptyMap("new-dungeon", "New Dungeon", 48, 32, 8),
    kind: "dungeon" as const,
  }));
  const [catalog, setCatalog] = useState<TileCatalog | null>(null);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [tile, setTile] = useState<AtlasTile | null>(null);
  const [tool, setTool] = useState<Tool>("paint");
  const [species, setSpecies] = useState("gaikotsu");
  const [zoneType, setZoneType] = useState<ZoneType>("enemy");
  const [levelMin, setLevelMin] = useState(1);
  const [levelMax, setLevelMax] = useState(5);
  const [zoneCount, setZoneCount] = useState(4);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; x2: number; y2: number } | null>(null);
  const [zoom, setZoom] = useState(24);
  const [status, setStatus] = useState("Pick a tile and paint. Scroll to explore your map.");
  const [saved, setSaved] = useState<MapFile[]>([]);
  const [savedId, setSavedId] = useState("");
  const [width, setWidth] = useState(48),
    [height, setHeight] = useState(32);
  const [kind, setKind] = useState<MapFile["kind"]>("dungeon");
  const [history, setHistory] = useState<MapFile[]>([]),
    [redo, setRedo] = useState<MapFile[]>([]);
  const viewport = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, w: 700, h: 480 });
  const pan = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const painting = useRef(false),
    lastCell = useRef(-1),
    current = useRef<MapFile>(map),
    draftRef = useRef<{ x: number; y: number; x2: number; y2: number } | null>(null);
  const setDocument = (next: MapFile) => {
    current.current = next;
    setMap(next as typeof map);
  };
  useEffect(() => {
    void loadTileCatalog().then((c) => {
      setCatalog(c);
      if (c) {
        setCategory(c.categories[0]?.id ?? "");
        setTile(c.categories[0]?.tiles[0] ?? null);
      } else setStatus("Tile catalog could not load. Reload Designer Mode to retry.");
    });
    try {
      const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      setSaved(Array.isArray(list) ? list.map(parseMapJson) : []);
    } catch {
      setStatus("Saved map library could not be read. Import a backup to recover it.");
    }
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setView((v) => ({ ...v, w: el.clientWidth, h: el.clientHeight })),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const c = canvas.current,
        ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      c.width = view.w;
      c.height = view.h;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, c.width, c.height);
      let pending = false;
      for (
        let y = Math.floor(view.y / zoom);
        y < Math.min(map.h, Math.ceil((view.y + view.h) / zoom));
        y++
      )
        for (
          let x = Math.floor(view.x / zoom);
          x < Math.min(map.w, Math.ceil((view.x + view.w) / zoom));
          x++
        ) {
          const t = map.tiles[y * map.w + x]!;
          const dx = x * zoom - view.x,
            dy = y * zoom - view.y;
          ctx.fillStyle = FLOOR_COLOR[t.floor] ?? FLOOR_COLOR[0]!;
          ctx.fillRect(dx, dy, zoom, zoom);
          if (t.sprite) {
            const img = tileImage(t.sprite);
            if (img.complete && img.naturalWidth) ctx.drawImage(img, dx, dy, zoom, zoom);
            else if (!img.complete) pending = true;
          }
          ctx.strokeStyle = t.block ? "#c4473a" : "#ffffff18";
          ctx.strokeRect(dx, dy, zoom, zoom);
        }
      for (const z of map.zones ?? []) {
        const dx = z.tx * zoom - view.x, dy = z.ty * zoom - view.y;
        ctx.fillStyle = z.type === "boss" ? "#c4473acc" : z.type === "mixed" ? "#b4a6ffcc" : z.type === "enemy" ? "#e6c15acc" : "#8fd06acc";
        ctx.fillRect(dx, dy, z.tw * zoom, z.th * zoom);
        ctx.strokeStyle = z.id === zoneId ? "#fff6e8" : "#e6c15a";
        ctx.lineWidth = z.id === zoneId ? 3 : 1;
        ctx.strokeRect(dx + 1, dy + 1, z.tw * zoom - 2, z.th * zoom - 2);
        if (zoom >= 16) {
          ctx.fillStyle = "#fff6e8";
          ctx.font = "12px monospace";
          const who = z.type === "enemy" || z.type === "boss" ? (MONSTERS.find((m) => m.id === z.species)?.name ?? ANIMALS.find((m) => m.id === z.species)?.name ?? z.species) : ZONE_LABEL[z.type];
          ctx.fillText(`${who} · lv ${z.levelMin}-${z.levelMax} · x${z.count}`, dx + 4, dy + 14);
        }
      }
      if (draft) {
        const tx = Math.min(draft.x, draft.x2), ty = Math.min(draft.y, draft.y2);
        ctx.strokeStyle = "#fff6e8";
        ctx.strokeRect(tx * zoom - view.x, ty * zoom - view.y, (Math.abs(draft.x2 - draft.x) + 1) * zoom, (Math.abs(draft.y2 - draft.y) + 1) * zoom);
      }
      for (const s of map.spawns ?? []) {
        ctx.fillStyle = s.boss ? "#c4473a" : "#e6c15a";
        ctx.font = "bold 14px monospace";
        ctx.fillText(
          s.boss ? "B" : "E",
          (s.x / TILE) * zoom - view.x - 5,
          (s.y / TILE) * zoom - view.y + 5,
        );
      }
      if (map.spawn) {
        ctx.fillStyle = "#8fd06a";
        ctx.font = "bold 14px monospace";
        ctx.fillText(
          "S",
          (map.spawn.tx + 0.5) * zoom - view.x - 5,
          (map.spawn.ty + 0.5) * zoom - view.y + 5,
        );
      }
      if (pending) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [map, view, zoom, draft, zoneId]);
  useEffect(() => {
    setWidth(map.w);
    setHeight(map.h);
    setKind(map.kind ?? "world");
  }, [map.w, map.h, map.kind]);
  function checkpoint() {
    setHistory((h) => [...h.slice(-19), structuredClone(current.current)]);
    setRedo([]);
  }
  function rememberDraft(next: { x: number; y: number; x2: number; y2: number } | null) {
    draftRef.current = next;
    setDraft(next);
  }
  function cellAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left + (viewport.current?.scrollLeft ?? 0)) / zoom),
      y: Math.floor((e.clientY - rect.top + (viewport.current?.scrollTop ?? 0)) / zoom),
    };
  }
  function clampZone(z: SpawnZone, w: number, h: number): SpawnZone {
    const tx = Math.max(0, Math.min(w - 1, Math.floor(z.tx)));
    const ty = Math.max(0, Math.min(h - 1, Math.floor(z.ty)));
    const tw = Math.max(1, Math.min(w - tx, Math.floor(z.tw)));
    const th = Math.max(1, Math.min(h - ty, Math.floor(z.th)));
    const lo = Math.max(1, Math.min(100, Math.floor(z.levelMin) || 1));
    const hi = Math.max(lo, Math.min(100, Math.floor(z.levelMax) || lo));
    const count = Math.max(1, Math.min(40, Math.floor(z.count) || 1));
    const species = z.type === "enemy" || z.type === "boss" ? z.species || "gaikotsu" : undefined;
    return { id: z.id, type: z.type, tx, ty, tw, th, ...(species ? { species } : {}), levelMin: lo, levelMax: hi, count };
  }
  function zoneWalkable(tx: number, ty: number, tw: number, th: number) {
    const m = current.current;
    for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) if (!m.tiles[y * m.w + x]?.block) return true;
    return false;
  }
  function commitZone(a: { x: number; y: number }, b: { x: number; y: number }) {
    const m = current.current;
    const tx = Math.max(0, Math.min(a.x, b.x, m.w - 1));
    const ty = Math.max(0, Math.min(a.y, b.y, m.h - 1));
    const x2 = Math.max(0, Math.min(m.w - 1, Math.max(a.x, b.x)));
    const y2 = Math.max(0, Math.min(m.h - 1, Math.max(a.y, b.y)));
    const tw = x2 - tx + 1, th = y2 - ty + 1;
    if (tw === 1 && th === 1) {
      const hit = (m.zones ?? []).find((z) => tx >= z.tx && ty >= z.ty && tx < z.tx + z.tw && ty < z.ty + z.th);
      if (hit) {
        setZoneId(hit.id);
        setZoneType(hit.type);
        setLevelMin(hit.levelMin);
        setLevelMax(hit.levelMax);
        setZoneCount(hit.count);
        if (hit.species) setSpecies(hit.species);
        setStatus("Selected spawn zone. Edit type, levels, and count below.");
        return;
      }
    }
    if (!zoneWalkable(tx, ty, tw, th)) return setStatus("A spawn zone needs at least one walkable tile.");
    const zone = clampZone({
      id: crypto.randomUUID(),
      type: zoneType,
      tx, ty, tw, th,
      species,
      levelMin,
      levelMax,
      count: zoneCount,
    }, m.w, m.h);
    checkpoint();
    setDocument({ ...m, zones: [...(m.zones ?? []), zone] });
    setZoneId(zone.id);
    setStatus(`${ZONE_LABEL[zone.type]} zone · ${zone.tw}×${zone.th} · ${zone.count} spawns · levels ${zone.levelMin}–${zone.levelMax}.`);
  }
  function patchZone(patch: Partial<SpawnZone>) {
    if (!zoneId) return;
    const m = current.current;
    const zones = (m.zones ?? []).map((z) => z.id === zoneId ? clampZone({ ...z, ...patch }, m.w, m.h) : z);
    setDocument({ ...m, zones });
  }
  function paint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left + (viewport.current?.scrollLeft ?? 0)) / zoom),
      y = Math.floor((e.clientY - rect.top + (viewport.current?.scrollTop ?? 0)) / zoom);
    const m = current.current,
      idx = y * m.w + x;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h || idx === lastCell.current) return;
    lastCell.current = idx;
    const next = { ...m, tiles: [...m.tiles], spawns: [...(m.spawns ?? [])] };
    if (tool === "start") {
      if (m.tiles[idx]?.block) return setStatus("Player start needs a walkable tile.");
      next.spawn = { tx: x, ty: y };
    } else if (tool === "enemy" || tool === "boss") {
      if (m.tiles[idx]?.block) return setStatus("Enemies need a walkable tile.");
      if (next.spawns.some((s) => Math.floor(s.x / TILE) === x && Math.floor(s.y / TILE) === y))
        return;
      next.spawns.push({
        id: crypto.randomUUID(),
        kind: "mob",
        species,
        x: (x + 0.5) * TILE,
        y: (y + 0.5) * TILE,
        level: Math.max(1, Math.min(100, Math.floor(tool === "boss" ? Math.max(levelMin, levelMax) : levelMin) || 1)),
        boss: tool === "boss",
      });
    } else if (tool === "remove")
      next.spawns = next.spawns.filter(
        (s) => Math.floor(s.x / TILE) !== x || Math.floor(s.y / TILE) !== y,
      );
    else if (tool === "wall")
      next.tiles[idx] = { ...m.tiles[idx]!, block: m.tiles[idx]!.block ? 0 : 1 };
    else if (tool === "erase") next.tiles[idx] = { floor: 8, biome: 3, block: 0, decor: 0 };
    else if (tile)
      next.tiles[idx] = { ...m.tiles[idx]!, sprite: tile.path, block: tile.solid ? 1 : 0 };
    setDocument(next);
  }
  function accept(m: MapFile) {
    checkpoint();
    setDocument(m);
    setWidth(m.w);
    setHeight(m.h);
    setKind(m.kind);
    viewport.current?.scrollTo(0, 0);
    setStatus(`Loaded ${m.name}.`);
  }
  function save() {
    try {
      const doc = parseMapJson(current.current);
      const list = [...saved.filter((m) => m.id !== doc.id), doc];
      localStorage.setItem(KEY, JSON.stringify(list));
      setSaved(list);
      setSavedId(doc.id);
      setStatus("Saved on this device. Export a file to share or back up.");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  const tiles =
    catalog?.categories
      .find((c) => c.id === category)
      ?.tiles.filter((t) => t.file.toLowerCase().includes(search.toLowerCase())) ?? [];
  return (
    <section className="designer-screen">
      <header className="designer-header">
        <div>
          <p className="font-display text-xs text-blood">BUILDER TOOLS</p>
          <h1 className="font-display text-lg">Map Builder</h1>
        </div>
        <button className="px-btn" onClick={onBack}>
          Back to Designer Mode
        </button>
      </header>
      <div className="designer-toolbar px-panel">
        <label>
          Name
          <input
            aria-label="Map name"
            className="px-input"
            value={map.name}
            maxLength={100}
            onChange={(e) => setDocument({ ...map, name: e.target.value })}
          />
        </label>
        <label>
          File ID
          <input
            aria-label="Map ID"
            className="px-input"
            value={map.id}
            onChange={(e) =>
              setDocument({ ...map, id: e.target.value.replace(/[^a-z0-9_-]/gi, "-") })
            }
          />
        </label>
        <label>
          Map type
          <select
            aria-label="Map type"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as MapFile["kind"];
              setKind(k);
              setDocument({ ...map, kind: k });
            }}
          >
            <option value="bossroom">Bossroom</option>
            <option value="dungeon">Dungeon</option>
            <option value="world">Full World</option>
          </select>
        </label>
        <label>
          Width
          <input
            className="px-input"
            type="number"
            min={4}
            max={512}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <label>
          Height
          <input
            className="px-input"
            type="number"
            min={4}
            max={512}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </label>
        <button
          className="px-btn"
          onClick={() => {
            if (
              !Number.isInteger(width) ||
              !Number.isInteger(height) ||
              width < 4 ||
              height < 4 ||
              width > 512 ||
              height > 512
            )
              return setStatus("Dimensions must be 4–512 whole tiles.");
            checkpoint();
            setDocument({ ...emptyMap(map.id, map.name, width, height, 8), kind });
            setStatus("Created a blank map. Undo restores your previous work.");
          }}
        >
          New blank map
        </button>
        <button
          className="px-btn"
          disabled={!history.length}
          onClick={() => {
            const prev = history.at(-1)!;
            setRedo((r) => [...r, current.current]);
            setHistory(history.slice(0, -1));
            setDocument(prev);
          }}
        >
          Undo
        </button>
        <button
          className="px-btn"
          disabled={!redo.length}
          onClick={() => {
            const next = redo.at(-1)!;
            setHistory((h) => [...h, current.current]);
            setRedo(redo.slice(0, -1));
            setDocument(next);
          }}
        >
          Redo
        </button>
        <button className="px-btn" onClick={save}>
          Save map
        </button>
        <button
          className="px-btn"
          onClick={() => {
            try {
              downloadMapFile(parseMapJson(current.current));
              setStatus("Exported map JSON for a future game update.");
            } catch (e) {
              setStatus((e as Error).message);
            }
          }}
        >
          Export JSON
        </button>
        <button className="px-btn" onClick={() => input.current?.click()}>
          Import JSON
        </button>
        <input
          ref={input}
          aria-label="Import map file"
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              if (file.size > 20_000_000) throw Error("Map file is too large (20 MB maximum).");
              accept(parseMapJson(JSON.parse(await file.text())));
            } catch (err) {
              setStatus((err as Error).message);
            }
          }}
        />
        <label>
          Saved maps
          <select
            aria-label="Saved maps"
            value={savedId}
            onChange={(e) => setSavedId(e.target.value)}
          >
            <option value="">Choose a saved map</option>
            {saved.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="px-btn"
          disabled={!savedId}
          onClick={() => {
            const m = saved.find((m) => m.id === savedId);
            if (m) accept(structuredClone(m));
          }}
        >
          Load saved
        </button>
      </div>
      <p role="status" className="designer-status">
        {status}
      </p>
      <div className="designer-workspace">
        <aside className="px-panel designer-palette">
          <label>
            Tile category
            <select
              aria-label="Tile category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {catalog?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} · {c.count}
                </option>
              ))}
            </select>
          </label>
          <input
            className="px-input"
            aria-label="Search tiles"
            placeholder="Search tiles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="text-dim">{tile?.file ?? "Loading tiles…"} · red border = solid</p>
          <div className="tile-palette">
            {tiles.map((t) => (
              <button
                key={t.id}
                title={t.file}
                aria-label={t.file}
                aria-pressed={tile?.id === t.id}
                className={`tile-choice ${tile?.id === t.id ? "selected" : ""}`}
                onClick={() => {
                  setTile(t);
                  setTool("paint");
                }}
              >
                <img src={t.path} loading="lazy" alt={t.file.replace(/_/g, " ")} />
              </button>
            ))}
          </div>
          {catalog && !tiles.length && <p>No matching tiles.</p>}
        </aside>
        <div className="designer-map">
          <div className="designer-toolbar">
            <label>
              Tool
              <select
                aria-label="Map tool"
                value={tool}
                onChange={(e) => setTool(e.target.value as Tool)}
              >
                {(
                  [
                    ["pan", "Pan map"],
                    ["paint", "Paint tile"],
                    ["erase", "Erase tile"],
                    ["wall", "Toggle collision"],
                    ["start", "Player start"],
                    ["enemy", "Enemy spawn"],
                    ["boss", "Boss spawn"],
                    ["zone", "Spawn zone"],
                    ["remove", "Remove entity"],
                  ] as const
                ).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Enemy type
              <select
                aria-label="Enemy species"
                value={species}
                onChange={(e) => {
                  setSpecies(e.target.value);
                  if (zoneId) patchZone({ species: e.target.value });
                }}
              >
                <optgroup label="Spirits">
                  {MONSTERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Animals">
                  {ANIMALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label>
              Zone type
              <select
                aria-label="Spawn zone type"
                value={zoneType}
                onChange={(e) => {
                  const type = e.target.value as ZoneType;
                  setZoneType(type);
                  setTool("zone");
                  if (zoneId) patchZone({ type, species });
                }}
              >
                {(Object.entries(ZONE_LABEL) as [ZoneType, string][]).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Level min
              <input className="px-input" aria-label="Zone level minimum" type="number" min={1} max={100} value={levelMin} onFocus={checkpoint} onChange={(e) => { const n = Number(e.target.value); setLevelMin(n); if (zoneId) patchZone({ levelMin: n }); }} />
            </label>
            <label>
              Level max
              <input className="px-input" aria-label="Zone level maximum" type="number" min={1} max={100} value={levelMax} onFocus={checkpoint} onChange={(e) => { const n = Number(e.target.value); setLevelMax(n); if (zoneId) patchZone({ levelMax: n }); }} />
            </label>
            <label>
              Spawn count
              <input className="px-input" aria-label="Zone spawn count" type="number" min={1} max={40} value={zoneCount} onFocus={checkpoint} onChange={(e) => { const n = Number(e.target.value); setZoneCount(n); if (zoneId) patchZone({ count: n }); }} />
            </label>
            <label>
              Zoom
              <select
                aria-label="Map zoom"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              >
                {[12, 24, 32, 48].map((n) => (
                  <option key={n} value={n}>
                    {n}px
                  </option>
                ))}
              </select>
            </label>
            <p>
              {map.w} × {map.h} · {map.spawns?.length ?? 0} entities · {map.zones?.length ?? 0} zones
            </p>
          </div>
          <div
            ref={viewport}
            className="map-builder-viewport"
            onScroll={(e) => {
              const x = e.currentTarget.scrollLeft,
                y = e.currentTarget.scrollTop;
              setView((v) => ({ ...v, x, y }));
            }}
          >
            <div style={{ width: map.w * zoom, height: map.h * zoom }}>
              <canvas
                ref={canvas}
                aria-label="Map editing canvas"
                className="map-builder-canvas"
                onPointerDown={(e) => {
                  painting.current = true;
                  lastCell.current = -1;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  if (tool === "pan")
                    pan.current = {
                      x: e.clientX,
                      y: e.clientY,
                      left: viewport.current?.scrollLeft ?? 0,
                      top: viewport.current?.scrollTop ?? 0,
                    };
                  else if (tool === "zone") {
                    const c = cellAt(e);
                    if (c.x < 0 || c.y < 0 || c.x >= current.current.w || c.y >= current.current.h) return;
                    rememberDraft({ x: c.x, y: c.y, x2: c.x, y2: c.y });
                  } else {
                    checkpoint();
                    paint(e);
                  }
                }}
                onPointerMove={(e) => {
                  if (!painting.current) return;
                  if (tool === "pan")
                    viewport.current?.scrollTo(
                      pan.current.left + pan.current.x - e.clientX,
                      pan.current.top + pan.current.y - e.clientY,
                    );
                  else if (tool === "zone") {
                    const c = cellAt(e);
                    const d = draftRef.current;
                    if (!d) return;
                    rememberDraft({
                      ...d,
                      x2: Math.max(0, Math.min(current.current.w - 1, c.x)),
                      y2: Math.max(0, Math.min(current.current.h - 1, c.y)),
                    });
                  } else paint(e);
                }}
                onPointerUp={() => {
                  painting.current = false;
                  const d = draftRef.current;
                  if (tool === "zone" && d) {
                    rememberDraft(null);
                    commitZone({ x: d.x, y: d.y }, { x: d.x2, y: d.y2 });
                  }
                }}
                onPointerCancel={() => {
                  painting.current = false;
                  rememberDraft(null);
                }}
              />
            </div>
          </div>
          <p className="text-dim">
            S = player start · E = enemy · B = boss. Drag with Spawn zone to paint a rectangle. Click a zone to edit its type, enemy, level range, and how many spawn. Zones fill in when the map is played. Files stay in Designer Mode until included in a future update.
          </p>
          {(map.zones ?? []).length > 0 && (
            <div className="designer-toolbar px-panel">
              <label>
                Edit zone
                <select aria-label="Spawn zones" value={zoneId ?? ""} onChange={(e) => {
                  const z = (map.zones ?? []).find((z) => z.id === e.target.value);
                  setZoneId(z?.id ?? null);
                  if (!z) return;
                  setZoneType(z.type);
                  setLevelMin(z.levelMin);
                  setLevelMax(z.levelMax);
                  setZoneCount(z.count);
                  if (z.species) setSpecies(z.species);
                }}>
                  <option value="">Select a zone</option>
                  {(map.zones ?? []).map((z, i) => (
                    <option key={z.id} value={z.id}>
                      {i + 1}. {ZONE_LABEL[z.type]} · lv {z.levelMin}-{z.levelMax} · x{z.count}
                    </option>
                  ))}
                </select>
              </label>
              <button className="px-btn" disabled={!zoneId} onClick={() => {
                if (!zoneId) return;
                checkpoint();
                setDocument({ ...current.current, zones: (current.current.zones ?? []).filter((z) => z.id !== zoneId) });
                setZoneId(null);
                setStatus("Spawn zone removed.");
              }}>
                Delete zone
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
