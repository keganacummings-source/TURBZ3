import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RACES, type RaceId } from "@/game/content";
import { loadCloudSave, writeCloudSave } from "@/game/cloud-client";
import { ingestCloud, noteArena, readArenaLocal } from "@/game/account-save";
import { postGrave } from "@/game/social-client";
import type { GraveBody } from "@/game/social-types";
import { ArenaScreen } from "@/components/arena-ui";
import { Boards, ChatDock, DuelBanner, Hub, Options } from "@/components/hub-ui";
import { MapBuilder } from "@/components/map-builder";
import { getSnap, subscribe, TurbzGame } from "@/game/engine";

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

function Hunt() {
  const snap = useSnap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<TurbzGame | null>(null);
  const [screen, setScreen] = useState<"hub" | "hunt" | "circle" | "hard" | "boards" | "options" | "build">("hub");
  const [arenaSeed, setArenaSeed] = useState<unknown>(null);
  const [create, setCreate] = useState(false);
  const [race, setRace] = useState<RaceId>("vesper");
  const [name, setName] = useState("");
  const username = snap.name || "witch";

  const onArenaCloud = useCallback((save: unknown | null) => {
    noteArena(save);
    setArenaSeed(save);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new TurbzGame(canvas);
    gameRef.current = game;
    game.attachCloud((json: string) => {
      void writeCloudSave(json);
    });
    game.attachGrave((body: GraveBody) => {
      void postGrave(body);
    });
    game.start();
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
          <div className="pointer-events-auto flex h-full items-center justify-center p-3">
            <div className="screen-card px-panel w-full max-w-md p-4">
              <p className="font-display text-xs text-blood">{screen === "hard" ? "HARDCORE" : "TURBOHUNT"}</p>
              <h2 className="font-display mt-2 text-lg text-bone">{screen === "hard" ? "Skill grind" : "Enter the wilds"}</h2>
              <p className="mt-2 text-dim">
                {snap.hasSave
                  ? "A save waits on this veil. Continue, or burn a new witch."
                  : "No save yet. Name a witch and pick a race."}
              </p>
              <div className="mt-4 grid gap-2">
                {snap.hasSave && (
                  <button className="px-btn px-btn-kyo" type="button" onClick={() => gameRef.current?.continueGame()}>
                    Continue
                  </button>
                )}
                <button className="px-btn" type="button" onClick={() => setCreate(true)}>
                  New witch
                </button>
                <button className="px-btn" type="button" onClick={() => setScreen("hub")}>
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
        {(screen === "hunt" || screen === "hard") && snap.mode !== "play" && create && (
          <div className="pointer-events-auto flex h-full items-center justify-center p-3">
            <div className="screen-card px-panel w-full max-w-md p-4">
              <p className="font-display text-bone">New witch</p>
              <label className="mt-3 grid gap-1 text-sm">
                Name
                <input className="px-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={16} />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {RACES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`px-btn ${race === r.id ? "px-btn-kyo" : ""}`}
                    onClick={() => setRace(r.id)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="px-btn px-btn-kyo"
                  type="button"
                  onClick={() => {
                    const n = name.trim() || "Witch";
                    if (screen === "hard") gameRef.current.rules = "hardcore";
                    else gameRef.current.rules = "hunt";
                    gameRef.current?.begin(n, race);
                    setCreate(false);
                  }}
                >
                  Begin
                </button>
                <button className="px-btn" type="button" onClick={() => setCreate(false)}>
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
        {screen === "circle" && (
          <div className="pointer-events-auto">
            <ArenaScreen seed={arenaSeed} onClose={() => setScreen("hub")} onCloud={onArenaCloud} />
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
          <div className="pointer-events-auto">
            <MapBuilder onBack={() => setScreen("hub")} />
          </div>
        )}
        {snap.mode === "play" && screen !== "circle" && (
          <div className="pointer-events-auto m-2 flex flex-wrap gap-2">
            <UserButton />
            <button className="px-btn" type="button" onClick={() => gameRef.current?.toggleMenu?.()}>
              Menu
            </button>
            <span className="text-dim text-sm self-center">
              Lv {snap.level} · {snap.hp}/{snap.maxHp} HP · {snap.kyo} kyo
            </span>
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
