/** Hunt and Witch Circle keep separate saves, bundled on the signed-in account. */

const ARENA_KEY = "turbz-arena-v1";

type Bundle = { kind: "turbz-bundle"; v: 1; hunt: unknown; arena: unknown };

let hunt: unknown = null;
let arena: unknown = null;
let ready = false;
let writer: ((json: string) => void) | null = null;

export function bindCloud(fn: (json: string) => void): void {
  writer = fn;
}

export function cloudReady(): void {
  ready = true;
  flush();
}

export function noteHunt(save: unknown): void {
  hunt = save;
  flush();
}

export function noteArena(save: unknown | null): void {
  arena = save;
  try {
    if (save) localStorage.setItem(ARENA_KEY, JSON.stringify(save));
    else localStorage.removeItem(ARENA_KEY);
  } catch {
    /* private mode */
  }
  flush();
}

export function readArenaLocal(): unknown {
  try {
    const text = localStorage.getItem(ARENA_KEY);
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
}

/** Old accounts stored a bare hunt save. A bundle keeps both modes. */
export function ingestCloud(raw: unknown): { hunt: unknown; arena: unknown } {
  if (raw && typeof raw === "object" && (raw as Bundle).kind === "turbz-bundle") {
    const bundle = raw as Bundle;
    hunt = bundle.hunt ?? null;
    arena = bundle.arena ?? null;
    try {
      if (arena) localStorage.setItem(ARENA_KEY, JSON.stringify(arena));
      else localStorage.removeItem(ARENA_KEY);
    } catch {
      /* ignore */
    }
    return { hunt, arena };
  }
  hunt = raw ?? null;
  arena = readArenaLocal();
  return { hunt, arena };
}

function flush(): void {
  if (!ready || !writer) return;
  const json = JSON.stringify({ kind: "turbz-bundle", v: 1, hunt: hunt ?? null, arena: arena ?? null } satisfies Bundle);
  writer(json);
}
