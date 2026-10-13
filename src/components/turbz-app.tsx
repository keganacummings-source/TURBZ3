import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { RaceId } from "@/game/content";
import { loadCloudSave, writeCloudSave } from "@/game/cloud-client";
import { bindCloud, ingestCloud, noteArena, readArenaLocal } from "@/game/account-save";
import { postGrave } from "@/game/social-client";
import type { GraveBody } from "@/game/social-types";
import { ArenaScreen } from "@/components/arena-ui";
import { Boards, ChatDock, DuelBanner, Hub, Options } from "@/components/hub-ui";
import { MapBuilder } from "@/components/map-builder";
import { Create, Play, Title } from "@/components/hunt-screens";
import { getSnap, subscribe, TurbzGame } from "@/game/engine";
import { applyHardcorePatch } from "@/game/hardcore-patch";
import { applyWorldBossPatch } from "@/game/world-boss-patch";
import { applyGearPatch } from "@/game/gear-patch";

function useSnap() {
  return useSyncExternalStore(subscribe, getSnap, getSnap);
}

export function TurbzApp() {
  const auth = useCurrentUserState();
  const local = import.meta.env.VITE_STATIC_HUNT === "1";
  const user = local ? { id: "local" } : auth.user;
  const isPending = local ? false : auth.isPending;
  if (isPending) {
    return (
      <main className="game-root grid place-items-center overflow-auto p-3">
        <div className="screen-card px-panel my-auto w-full max-w-md overflow-auto p-4">
          <p className="font-display text-xs text-blood">TURBZ API</p>
          <h1 className="font-display mt-3 text-xl text-bone">TURBZ</h1>
          <p className="mt-3 text-dim">Checking your account. Autosave and lobbies wait on the veil.</p>
        </div>
      </main>
    );
  }
  if (!user) return <ApiGate />;
  return <Hunt />;
}

export function ApiGate() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("up");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const name = user.trim();
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(name)) {
      setErr("Username is 3–16 letters, numbers, or _.");
      return;
    }
    if (password.length < 8) {
      setErr("Password needs 8 characters.");
      return;
    }
    setBusy(true);
    setErr("");
    const email = `${name.toLowerCase()}@hunt.turbz`;
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message || "That name is taken");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Wrong name or password");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "TURBZ API refused that");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="game-root grid place-items-center overflow-auto p-3">
      <div className="screen-card px-panel my-auto w-full max-w-md overflow-auto p-4">
        <p className="font-display text-xs text-blood">TURBZ API</p>
        <h1 className="font-display mt-3 text-xl text-bone">Sign in to hunt</h1>
        <p className="mt-3 text-dim">Username and password only. That account autosaves, and lobby codes meet other TURBZ witches.</p>
        <form
          className="mt-4 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="grid gap-1 text-sm">
            Username
            <input className="px-input" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </label>
          <label className="grid gap-1 text-sm">
            Password
            <input
              className="px-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
            />
          </label>
          {err && <p className="text-blood text-sm">{err}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" className="px-btn px-btn-kyo" disabled={busy}>
              {busy ? "…" : mode === "up" ? "Create" : "Enter"}
            </button>
            <button type="button" className="px-btn" onClick={() => setMode(mode === "up" ? "in" : "up")}>
              {mode === "up" ? "Have an account" : "Need an account"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function makeCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]!;
  return s;
}

function Hunt() {
  const snap = useSnap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<TurbzGame | null>(null);
  const [screen, setScreen] = useState<"hub" | "hunt" | "circle" | "hard" | "boards" | "options" | "build">("hub");
  const [arenaSeed, setArenaSeed] = useState<unknown>(null);
  const [create, setCreate] = useState(false);
  const [race, setRace] = useState<RaceId>("vesper");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [intent, setIntent] = useState<"solo" | "host" | "join">("solo");
  const [chat, setChat] = useState("");
  const [booted, setBooted] = useState(false);
  const username = snap.name || "witch";

  const g = () => gameRef.current;

  const onArenaCloud = useCallback((save: unknown | null) => {
    noteArena(save);
    setArenaSeed(save);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new TurbzGame(canvas);
    applyHardcorePatch(game);
    applyWorldBossPatch(game);
    applyGearPatch(game);
    gameRef.current = game;
    game.attachCloud((json: string) => {
      void writeCloudSave(json);
      try {
        const parsed = JSON.parse(json);
        if (parsed) bindCloud(parsed);
      } catch {}
    });
    game.attachGrave((body: GraveBody) => {
      void postGrave(body);
    });
    game.start();
    setBooted(true);
    void loadCloudSave()
      .then((split) => {
        if (split) {
          ingestCloud(split);
          if (split.hunt && typeof split.hunt === "object") game.rememberCloud(split.hunt);
          if (split.hardcore && typeof split.hardcore === "object") game.rememberHard(split.hardcore);
          if (split.arena) setArenaSeed(split.arena);
          else setArenaSeed(readArenaLocal());
        } else setArenaSeed(readArenaLocal());
      })
      .catch(() => setArenaSeed(readArenaLocal()));
    return () => game.stop();
  }, []);

  return (
    <main className="game-root relative overflow-hidden">
      <canvas ref={canvasRef} className="game-canvas absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="pointer-events-auto">
          <ChatDock username={username} playing={snap.mode === "play" && screen !== "hub"} />
        </div>
        {screen === "hub" && snap.mode !== "play" && (
          <div className="pointer-events-auto">
            <Hub
              username={username}
              onHunt={() => {
                setCreate(false);
                setScreen("hunt");
              }}
              onCircle={() => setScreen("circle")}
              onHard={() => {
                setCreate(false);
                setScreen("hard");
              }}
              onBoards={() => setScreen("boards")}
              onOptions={() => setScreen("options")}
              onBuild={() => setScreen("build")}
            />
          </div>
        )}
        {(screen === "hunt" || screen === "hard") && snap.mode !== "play" && !create && (
          <div className="pointer-events-auto">
            <Title
              kind={screen === "hard" ? "hard" : "hunt"}
              hasSave={snap.hasSave}
              code={code}
              setCode={setCode}
              onBack={() => setScreen("hub")}
              onNew={() => {
                setIntent("solo");
                setCreate(true);
              }}
              onContinue={() => {
                g()?.continueGame();
              }}
              onHost={() => {
                const c = code.trim() || makeCode();
                setCode(c);
                setIntent("host");
                if (snap.hasSave) g()?.continueGame({ role: "host", code: c });
                else setCreate(true);
              }}
              onJoin={() => {
                const c = code.trim();
                if (c.length < 3) return;
                setIntent("join");
                if (snap.hasSave) g()?.continueGame({ role: "guest", code: c });
                else setCreate(true);
              }}
              circleReady={booted}
              circleMarks={
                arenaSeed && typeof arenaSeed === "object" && "points" in arenaSeed
                  ? Number((arenaSeed as { points: number }).points)
                  : null
              }
              onCircle={() => setScreen("circle")}
            />
          </div>
        )}
        {(screen === "hunt" || screen === "hard") && snap.mode !== "play" && create && (
          <div className="pointer-events-auto">
            <Create
              name={name}
              setName={setName}
              race={race}
              setRace={setRace}
              game={g()}
              onBack={() => setCreate(false)}
              onGo={() => {
                if (screen === "hard") {
                  try {
                    g()!.rules = "hardcore";
                  } catch {}
                }
                const lobby =
                  intent === "solo"
                    ? undefined
                    : { role: intent === "host" ? ("host" as const) : ("guest" as const), code: code.trim() || makeCode() };
                g()?.begin(name, race, lobby);
                setCreate(false);
              }}
            />
          </div>
        )}
        {snap.mode === "play" && screen !== "circle" && screen !== "boards" && screen !== "options" && screen !== "build" && (
          <div className="pointer-events-none absolute inset-0">
            <Play snap={snap} game={g()} chat={chat} setChat={setChat} />
          </div>
        )}
        {screen === "circle" && (
          <div className="pointer-events-auto">
            <ArenaScreen
              seed={arenaSeed}
              onClose={() => setScreen("hub")}
              onCloud={onArenaCloud}
              onGrave={(body) => {
                void postGrave(body).catch(() => {});
              }}
            />
          </div>
        )}
        {screen === "boards" && snap.mode !== "play" && (
          <div className="pointer-events-auto">
            <Boards onBack={() => setScreen("hub")} />
          </div>
        )}
        {screen === "options" && snap.mode !== "play" && (
          <div className="pointer-events-auto">
            <Options username={username} onBack={() => setScreen("hub")} />
          </div>
        )}
        {screen === "build" && snap.mode !== "play" && (
          <div className="pointer-events-auto absolute inset-0 z-20">
            <MapBuilder onBack={() => setScreen("hub")} />
          </div>
        )}
        {snap.duel && (
          <div className="pointer-events-auto">
            <DuelBanner duel={snap.duel} />
          </div>
        )}
      </div>
    </main>
  );
}
