import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RACES, TYPES, type RaceId, type TypeId } from "@/game/content";
import { loadCloudSave, writeCloudSave } from "@/game/cloud-client";
import { bindCloud, cloudReady, ingestCloud, noteArena, noteHardcore, noteHunt, readArenaLocal } from "@/game/account-save";
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
            <input className="px-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} />
          </label>
          {err && <p className="text-blood text-sm">{err}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" className="px-btn px-btn-kyo" disabled={busy}>
              {busy ? "…" : mode === "up" ? "Create" : "Enter"}
            </button>
            <button
              type="button"
              className="px-btn"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
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
  const gameRef = useRef<TurbzGame | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<"hub" | "hunt" | "circle" | "hard" | "boards" | "options" | "build">("hub");
  const [arenaSeed, setArenaSeed] = useState<unknown>(null);
  const [create, setCreate] = useState(false);
  const username = snap.name || "witch";

  const onArenaCloud = useCallback((save: unknown | null) => {
    noteArena(save);
    setArenaSeed(save);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!gameRef.current) gameRef.current = new TurbzGame(canvas);
    const game = gameRef.current;
    game.mount();
    return () => game.unmount();
  }, []);

  useEffect(() => {
    void loadCloudSave()
      .then((split) => {
        if (split) {
          ingestCloud(split);
          if (split.arena) setArenaSeed(split.arena);
          else setArenaSeed(readArenaLocal());
        } else setArenaSeed(readArenaLocal());
      })
      .catch(() => setArenaSeed(readArenaLocal()));
  }, []);

  const game = gameRef.current;

  return (
    <main className="game-root relative overflow-hidden">
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="game-ui pointer-events-none absolute inset-0 flex flex-col">
        <div className="pointer-events-auto">
          <ChatDock username={username} playing={snap.mode === "play" && screen !== "hub"} />
          {screen === "hub" && snap.mode !== "play" && (
            <Hub
              username={username}
              onHunt={() => setScreen("hunt")}
              onCircle={() => setScreen("circle")}
              onHard={() => setScreen("hard")}
              onBoards={() => setScreen("boards")}
              onOptions={() => setScreen("options")}
              onBuild={() => setScreen("build")}
            />
          )}
          {screen === "circle" && (
            <ArenaScreen
              seed={arenaSeed}
              onClose={() => setScreen("hub")}
              onCloud={onArenaCloud}
            />
          )}
          {screen === "boards" && snap.mode !== "play" && <Boards onBack={() => setScreen("hub")} />}
          {screen === "options" && snap.mode !== "play" && (
            <Options username={username} onBack={() => setScreen("hub")} />
          )}
          {screen === "build" && snap.mode !== "play" && <MapBuilder onBack={() => setScreen("hub")} />}
          {screen === "hunt" && snap.mode !== "play" && !create && (
            <div className="screen-card px-panel m-3 max-w-md p-4">
              <p className="font-display text-bone">Hunt</p>
              <button className="px-btn px-btn-kyo mt-3" onClick={() => game?.startHunt?.(false)}>
                Enter the wilds
              </button>
              <button className="px-btn mt-2" onClick={() => setScreen("hub")}>
                Back
              </button>
            </div>
          )}
          {screen === "hard" && snap.mode !== "play" && (
            <div className="screen-card px-panel m-3 max-w-md p-4">
              <p className="font-display text-bone">Hardcore</p>
              <button className="px-btn px-btn-kyo mt-3" onClick={() => game?.startHunt?.(true)}>
                Skill grind
              </button>
              <button className="px-btn mt-2" onClick={() => setScreen("hub")}>
                Back
              </button>
            </div>
          )}
          {snap.mode === "play" && (
            <div className="pointer-events-auto m-2 flex gap-2">
              <UserButton />
              <button className="px-btn" onClick={() => game?.pause?.()}>
                Pause
              </button>
            </div>
          )}
        </div>
      </div>
      <DuelBanner />
    </main>
  );
}
