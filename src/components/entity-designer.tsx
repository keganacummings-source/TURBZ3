import { useEffect, useRef, useState } from "react";
import { TYPES, type TypeId } from "@/game/content";
import {
  CATEGORY_LABELS,
  defaultNotes,
  newEntityDesign,
  parseEntityDesign,
  type EntityCategory,
  type EntityDesign,
} from "@/game/entity-design";

const KEY = "turbz-designer-entities-v1";

const ACTIONS = ["Interact", "Chop log", "Take fish", "Make Food", "Mine ore", "Talk", "Rest", "Open", "Custom"];
const SKILLS = ["none", "woodcutting", "fishing", "mining", "hunting", "alchemy", "social", "physical", "magic"];

export function EntityDesigner({ onBack }: { onBack: () => void }) {
  const [entity, setEntity] = useState<EntityDesign>(() => newEntityDesign("enemy"));
  const [color, setColor] = useState("#e6c15a");
  const [erase, setErase] = useState(false);
  const [editingGhost, setEditingGhost] = useState(false);
  const [status, setStatus] = useState("Choose a category, draw the sprite, set stats or actions, and read the notes.");
  const [saved, setSaved] = useState<EntityDesign[]>([]);
  const [selected, setSelected] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [history, setHistory] = useState<EntityDesign[]>([]);

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      setSaved(Array.isArray(list) ? list.map(parseEntityDesign) : []);
    } catch {
      setStatus("Saved entity library could not be read. Import a backup to recover it.");
    }
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 256, 256);
    const pixels = editingGhost && entity.ghostPixels ? entity.ghostPixels : entity.pixels;
    pixels.forEach((p, i) => {
      const x = i % 16,
        y = Math.floor(i / 16);
      ctx.fillStyle = (x + y) % 2 ? "#2a2220" : "#3a3029";
      ctx.fillRect(x * 16, y * 16, 16, 16);
      if (p) {
        ctx.fillStyle = p;
        ctx.fillRect(x * 16, y * 16, 16, 16);
      }
      ctx.strokeStyle = "#ffffff18";
      ctx.strokeRect(x * 16, y * 16, 16, 16);
    });
  }, [entity, editingGhost]);

  function paint(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect(),
      x = Math.floor(((e.clientX - r.left) / r.width) * 16),
      y = Math.floor(((e.clientY - r.top) / r.height) * 16);
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    setEntity((ent) => {
      const key = editingGhost ? "ghostPixels" : "pixels";
      const current = ent[key] ?? ent.pixels;
      const pixels = [...current];
      pixels[y * 16 + x] = erase ? null : color;
      return { ...ent, [key]: pixels };
    });
  }

  function run(fn: () => void) {
    try {
      fn();
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  function changeCategory(cat: EntityCategory) {
    setEntity((ent) => ({
      ...newEntityDesign(cat),
      id: ent.id,
      name: ent.name,
      notes: defaultNotes(cat),
    }));
    setEditingGhost(false);
  }

  const isEnemy = entity.category === "enemy";
  const isWeapon = entity.category === "weapon";
  const isInteractable = ["tree", "fishing", "mining", "campfire", "board", "custom", "npc"].includes(
    entity.category,
  );

  return (
    <section className="designer-screen">
      <header className="designer-header">
        <div>
          <p className="font-display text-xs text-blood">BUILDER TOOLS</p>
          <h1 className="font-display text-lg">Entity & Object Designer</h1>
        </div>
        <button className="px-btn" onClick={onBack}>
          Back to Designer Mode
        </button>
      </header>

      <div className="weapon-workspace px-panel">
        <div>
          <div className="mb-2 text-sm text-kyo">
            {editingGhost ? "Editing GHOST variant" : "Editing MAIN sprite"} · 16×16
          </div>
          <canvas
            ref={canvas}
            width={256}
            height={256}
            className="weapon-pixel-canvas"
            aria-label="Entity pixel canvas"
            onPointerDown={(e) => {
              setHistory((h) => [...h.slice(-19), structuredClone(entity)]);
              drawing.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              paint(e);
            }}
            onPointerMove={(e) => {
              if (drawing.current) paint(e);
            }}
            onPointerUp={() => {
              drawing.current = false;
            }}
            onPointerCancel={() => {
              drawing.current = false;
            }}
          />
          <div className="designer-toolbar">
            <label>
              Pixel color
              <input
                type="color"
                aria-label="Pixel color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <button className="px-btn" aria-pressed={erase} onClick={() => setErase(!erase)}>
              {erase ? "Eraser on" : "Paint pixels"}
            </button>
            {isEnemy && (
              <button
                className="px-btn"
                aria-pressed={editingGhost}
                onClick={() => setEditingGhost(!editingGhost)}
              >
                {editingGhost ? "Edit main" : "Edit ghost"}
              </button>
            )}
            <button
              className="px-btn"
              disabled={!history.length}
              onClick={() => {
                setEntity(history.at(-1)!);
                setHistory(history.slice(0, -1));
              }}
            >
              Undo
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <label>
            Category
            <select
              value={entity.category}
              onChange={(e) => changeCategory(e.target.value as EntityCategory)}
            >
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input
              className="px-input"
              aria-label="Entity name"
              value={entity.name}
              maxLength={100}
              onChange={(e) => setEntity({ ...entity, name: e.target.value })}
            />
          </label>
          <label>
            File ID
            <input
              className="px-input"
              aria-label="Entity ID"
              value={entity.id}
              onChange={(e) =>
                setEntity({ ...entity, id: e.target.value.replace(/[^a-z0-9_-]/gi, "-") })
              }
            />
          </label>

          {(isEnemy || isWeapon) && (
            <label>
              Element
              <select
                value={entity.type ?? "normal"}
                onChange={(e) => setEntity({ ...entity, type: e.target.value as TypeId })}
              >
                {Object.entries(TYPES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isEnemy && (
            <>
              {(
                [
                  ["hp", 1, 9999],
                  ["damage", 0, 500],
                  ["speed", 0.1, 5],
                  ["range", 8, 500],
                ] as const
              ).map(([key, min, max]) => (
                <label key={key}>
                  {key.toUpperCase()}
                  <input
                    className="px-input"
                    type="number"
                    min={min}
                    max={max}
                    step={key === "speed" ? 0.1 : 1}
                    value={entity[key] ?? 0}
                    onChange={(e) => setEntity({ ...entity, [key]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </>
          )}

          {isWeapon && (
            <>
              {(
                [
                  ["damage", 1, 500],
                  ["speed", 0.2, 5],
                  ["range", 16, 500],
                ] as const
              ).map(([key, min, max]) => (
                <label key={key}>
                  {key}
                  <input
                    className="px-input"
                    type="number"
                    min={min}
                    max={max}
                    step={key === "speed" ? 0.1 : 1}
                    value={entity[key] ?? 0}
                    onChange={(e) => setEntity({ ...entity, [key]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </>
          )}

          {isInteractable && (
            <>
              <label>
                Primary action
                <select
                  value={entity.action ?? "Interact"}
                  onChange={(e) => setEntity({ ...entity, action: e.target.value })}
                >
                  {ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Required skill
                <select
                  value={entity.skill ?? "none"}
                  onChange={(e) => setEntity({ ...entity, skill: e.target.value })}
                >
                  {SKILLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Yield item
                <input
                  className="px-input"
                  placeholder="timber, fish, ore, food..."
                  value={entity.yield ?? ""}
                  onChange={(e) => setEntity({ ...entity, yield: e.target.value })}
                />
              </label>
            </>
          )}

          <label>
            About (flavor)
            <input
              className="px-input"
              value={entity.about ?? ""}
              maxLength={500}
              onChange={(e) => setEntity({ ...entity, about: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="px-panel p-4 mt-4 max-w-3xl">
        <h2 className="font-display text-sm text-kyo mb-2">Designer Notes — what this is / can do</h2>
        <textarea
          className="px-input w-full"
          rows={5}
          value={entity.notes}
          maxLength={2000}
          onChange={(e) => setEntity({ ...entity, notes: e.target.value })}
          aria-label="Designer notes"
        />
        <p className="text-dim text-sm mt-2">
          These notes travel with the export so anyone using the object knows its purpose, actions,
          and placement tips. Examples: “Chop log with Woodcutting to gain timber.” “Take fish then
          Make Food at a campfire.”
        </p>
      </div>

      <div className="designer-toolbar">
        <button
          className="px-btn"
          onClick={() =>
            run(() => {
              const e = parseEntityDesign(entity);
              const list = [...saved.filter((x) => x.id !== e.id), e];
              localStorage.setItem(KEY, JSON.stringify(list));
              setSaved(list);
              setSelected(e.id);
              setStatus("Saved on this device. Export a backup to share or include in a map.");
            })
          }
        >
          Save entity
        </button>
        <button
          className="px-btn"
          onClick={() =>
            run(() => {
              const e = parseEntityDesign(entity);
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(e, null, 2)], { type: "application/json" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = `${e.id}.entity.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setStatus("Exported entity JSON for Map Builder or future game updates.");
            })
          }
        >
          Export JSON
        </button>
        <button className="px-btn" onClick={() => input.current?.click()}>
          Import JSON
        </button>
        <input
          ref={input}
          type="file"
          aria-label="Import entity file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              if (file.size > 200000) throw Error("Entity file is too large.");
              setEntity(parseEntityDesign(JSON.parse(await file.text())));
              setStatus("Imported entity.");
            } catch (err) {
              setStatus((err as Error).message);
            }
          }}
        />
        <label>
          Saved entities
          <select
            aria-label="Saved entities"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Choose an entity</option>
            {saved.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({CATEGORY_LABELS[e.category]})
              </option>
            ))}
          </select>
        </label>
        <button
          className="px-btn"
          disabled={!selected}
          onClick={() => {
            const e = saved.find((e) => e.id === selected);
            if (e) setEntity(structuredClone(e));
          }}
        >
          Load saved
        </button>
      </div>
      <p role="status" className="designer-status">
        {status}
      </p>
    </section>
  );
}
