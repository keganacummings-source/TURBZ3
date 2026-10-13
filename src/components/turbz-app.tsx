import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CLASSES, CLASS_RACE, RACES, TYPES, equipmentStats, type ClassId, type RaceId, type TypeId } from "@/game/content";
import { loadCloudSave, writeCloudSave } from "@/game/cloud-client";
import { bindCloud, cloudReady, ingestCloud, noteArena, noteHardcore, noteHunt, readArenaLocal } from "@/game/account-save";
import { postGrave } from "@/game/social-client";
import type { GraveBody } from "@/game/social-types";
import { bestFood } from "@/game/item-use";
import { DesignerMode } from "@/components/designer-mode";
import { ArenaScreen } from "@/components/arena-ui";
import { Boards, ChatDock, DuelBanner, Hub, Options } from "@/components/hub-ui";
import { actorSpritesReady } from "@/game/actor-sprites";
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
          <input
            value={user}
            onChange={(e) => setUser(e.target.value.slice(0, 16))}
            required
            placeholder="Username"
            aria-label="Username"
            autoComplete="username"
            className="w-full border-2 border-bone bg-ink px-3 py-2 text-bone outline-none"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
            placeholder="Password"
            aria-label="Password"
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            className="w-full border-2 border-bone bg-ink px-3 py-2 text-bone outline-none"
          />
          {err && <p className="text-blood">{err}</p>}
          <button className="px-btn px-btn-kyo" type="submit" disabled={busy}>
            {busy ? "Wait" : mode === "up" ? "Create account" : "Sign in"}
          </button>
          <button className="px-btn" type="button" onClick={() => setMode(mode === "up" ? "in" : "up")}>
            {mode === "up" ? "I already have a name" : "Need a name"}
          </button>
        </form>
      </div>
    </main>
  );
}

function veilName(user: { id: string; displayName?: string | null; primaryEmail?: string | null }): string {
  const raw = (user.displayName || user.primaryEmail || "witch").split("@")[0] ?? "witch";
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16);
  if (cleaned.length >= 3) return cleaned;
  const tail = user.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `w${tail}`.slice(0, 16);
}

function Hunt() {
  const auth = useCurrentUserState();
  const username = auth.user ? veilName(auth.user) : "witch";
  const snap = useSnap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<TurbzGame | null>(null);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("Mira");
  const [classId, setClassId] = useState<ClassId>("warden");
  const race = CLASS_RACE[classId];
  const [code, setCode] = useState("");
  const [intent, setIntent] = useState<"solo" | "host" | "join">("solo");
  const [chat, setChat] = useState("");
  const [screen, setScreen] = useState<"hub" | "hunt" | "circle" | "hard" | "boards" | "options" | "designer">("hub");
  const [arenaSeed, setArenaSeed] = useState<unknown>(null);
  const [booted, setBooted] = useState(false);

  const onArenaCloud = useCallback((save: unknown | null) => {
    noteArena(save);
    setArenaSeed(save);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new TurbzGame(canvas);
    gameRef.current = game;
    game.attachCloud((json) => {
      try {
        const parsed = JSON.parse(json) as { slot?: string; save?: unknown };
        if (parsed && parsed.slot === "hardcore") noteHardcore(parsed.save);
        else if (parsed && parsed.slot === "hunt") noteHunt(parsed.save);
        else noteHunt(parsed);
      } catch {
        /* keep the local hunt */
      }
    });
    game.attachGrave((body: GraveBody) => {
      void postGrave(body).catch(() => {});
    });
    game.start();
    bindCloud((json) => {
      void writeCloudSave({ data: json }).catch(() => {});
    });
    void loadCloudSave()
      .then((text) => {
        if (typeof text === "string" && text.length > 2) {
          try {
            const split = ingestCloud(JSON.parse(text) as unknown);
            if (split.hunt && typeof split.hunt === "object") game.rememberCloud(split.hunt);
            if (split.hardcore && typeof split.hardcore === "object") game.rememberHard(split.hardcore);
            setArenaSeed(split.arena);
          } catch {
            setArenaSeed(readArenaLocal());
          }
        } else setArenaSeed(readArenaLocal());
      })
      .catch(() => setArenaSeed(readArenaLocal()))
      .finally(() => {
        cloudReady();
        setBooted(true);
      });
    return () => game.stop();
  }, []);

  const g = () => gameRef.current;

  return (
    <main className="game-root">
      <canvas ref={canvasRef} className="game-canvas" aria-label="TURBZ wilds" />
      <div className="overlay">
        {!create && screen !== "designer" && <ChatDock username={username} playing={snap.mode === "play" && screen !== "hub"} />}
        {screen === "hub" && snap.mode !== "play" && (
          <Hub
            username={username}
            onHunt={() => {
              g()?.swapRules("hunt");
              setScreen("hunt");
            }}
            onCircle={() => setScreen("circle")}
            onHard={() => {
              g()?.swapRules("hardcore");
              setScreen("hard");
            }}
            onBoards={() => setScreen("boards")}
            onOptions={() => setScreen("options")}
            onDesigner={() => setScreen("designer")}
          />
        )}
        {(screen === "hunt" || screen === "hard") && snap.mode !== "play" && !create && (
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
        )}
        {(screen === "hunt" || screen === "hard") && snap.mode !== "play" && create && (
          <Create
            name={name}
            setName={setName}
            classId={classId}
            setClassId={setClassId}
            game={g()}
            onBack={() => setCreate(false)}
            onGo={() => {
              const lobby =
                intent === "solo"
                  ? undefined
                  : { role: intent === "host" ? ("host" as const) : ("guest" as const), code: code.trim() || makeCode() };
              g()?.begin(name, race, lobby, classId);
              setCreate(false);
            }}
          />
        )}
        {snap.mode === "play" && screen !== "circle" && screen !== "boards" && screen !== "options" && (
          <Play snap={snap} game={g()} chat={chat} setChat={setChat} />
        )}
        {screen === "designer" && snap.mode !== "play" && <DesignerMode onBack={() => setScreen("hub")} />}
        {screen === "circle" && (
          <ArenaScreen
            seed={arenaSeed}
            onClose={() => setScreen("hub")}
            onCloud={onArenaCloud}
            onGrave={(body) => {
              void postGrave(body).catch(() => {});
            }}
          />
        )}
        {screen === "boards" && snap.mode !== "play" && <Boards onBack={() => setScreen("hub")} />}
        {screen === "options" && snap.mode !== "play" && <Options username={username} onBack={() => setScreen("hub")} />}
      </div>
    </main>
  );
}

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function Title(props: {
  kind: "hunt" | "hard";
  hasSave: boolean;
  code: string;
  setCode: (v: string) => void;
  onBack: () => void;
  onNew: () => void;
  onContinue: () => void;
  onHost: () => void;
  onJoin: () => void;
  circleReady: boolean;
  circleMarks: number | null;
  onCircle: () => void;
}) {
  const hard = props.kind === "hard";
  return (
    <div className="flex h-full items-center justify-center overflow-auto p-3 pb-20">
      <div className="screen-card px-panel my-auto w-full max-w-xl p-4 sm:p-5">
        <p className="font-display text-xs text-blood">{hard ? "HARDCORE" : "TURBOHUNT"}</p>
        <h1 className="font-display mt-3 text-lg text-bone sm:text-2xl">{hard ? "The frontier" : "The hunt"}</h1>
        <p className="mt-3 text-dim">
          {hard
            ? "A separate wilderness. Hunger, thirst and sleep drain during active play. Hunt or buy food, chop logs, cook on campfires and purify gathered water. Only healing spells mend lasting wounds. Death takes this body, even in dungeons."
            : "Die and you must choose a new witch. A finished set of her blood can be worn again. Otherwise you wake in the default robes, at another tavern, beside the bounty board."}
        </p>
        <div className="mt-5 grid gap-2">
          <button className="px-btn px-btn-kyo" onClick={props.onNew}>
            {hard ? "New hardcore witch" : "New Hunt"}
          </button>
          <button className="px-btn" disabled={!props.hasSave} onClick={props.onContinue}>
            Continue
          </button>
          {!hard && (
            <button className="px-btn" disabled={!props.circleReady} onClick={props.onCircle}>
              {props.circleMarks != null && props.circleMarks > 0 ? `Witch Circle · ${props.circleMarks}` : "Witch Circle"}
            </button>
          )}
          <button className="px-btn" onClick={props.onBack}>
            Back to the veil
          </button>
        </div>
        {!hard && (
          <div className="mt-5 border-t-2 border-bone pt-4">
            <p className="font-display text-xs text-kyo">Lobby code</p>
            <p className="text-dim">Same code finds another signed-in witch.</p>
            <input
              value={props.code}
              onChange={(e) => props.setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="CODE"
              aria-label="Lobby code"
              autoComplete="off"
              suppressHydrationWarning
              className="mt-2 w-full border-2 border-bone bg-ink px-3 py-2 font-display text-xs text-bone outline-none"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="px-btn" onClick={props.onHost}>
                Create
              </button>
              <button className="px-btn" onClick={props.onJoin}>
                Join
              </button>
            </div>
          </div>
        )}
        <p className="mt-4 text-dim">
          {hard
            ? "Counters, steps, and rolls can slip. A long roll can clear a blow. Spamming them only chips, and then you trip. Strike when it is your verse."
            : "Right-click for menus. Walk into a node to harvest it. Click a keeper only when you are already near."}
        </p>
      </div>
    </div>
  );
}

function Create(props: {
  name: string;
  setName: (v: string) => void;
  classId: ClassId;
  setClassId: (id: ClassId) => void;
  game: TurbzGame | null;
  onBack: () => void;
  onGo: () => void;
}) {
  return (
    <div className="flex h-full items-start justify-center overflow-auto p-3 pb-20">
      <div className="px-panel my-auto w-full max-w-3xl p-4">
        <p className="font-display text-xs text-blood">CHOOSE A CLASS</p>
        <h2 className="font-display mt-2 text-sm text-bone">Ten classes of the veil</h2>
        <label className="mt-3 block text-dim">
          Name
          <input
            value={props.name}
            onChange={(e) => props.setName(e.target.value.slice(0, 16))}
            className="mt-1 w-full border-2 border-bone bg-ink px-3 py-2 text-bone outline-none"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CLASSES.map((r) => (
            <button
              key={r.id}
              className={`border-2 p-2 text-left ${props.classId === r.id ? "border-kyo bg-ink" : "border-bone bg-ink"}`}
              onClick={() => props.setClassId(r.id)}
            >
              <RaceCanvas race={CLASS_RACE[r.id]} classId={r.id} game={props.game} active={props.classId === r.id} />
              <span className="font-body mt-2 block break-words text-xl">{r.name}</span>
              <span className={`block ${typeClass(r.type)}`}>{TYPES[r.type].name}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-dim">{CLASSES.find((r) => r.id === props.classId)?.specialty}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button className="px-btn" onClick={props.onBack}>
            Back
          </button>
          <button className="px-btn px-btn-kyo" onClick={props.onGo}>
            Wake in the robes
          </button>
        </div>
      </div>
    </div>
  );
}

function RaceCanvas({ race, classId, game, active }: { race: RaceId; classId: ClassId; game: TurbzGame | null; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !game) return;
    canvas.width = 120;
    canvas.height = 140;
    let frame = 0;
    const draw = () => {
      game.preview(canvas, race, classId);
      if (active || !actorSpritesReady()) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [race, classId, game, active]);
  return <canvas ref={ref} width={120} height={140} className="h-28 w-full bg-ink" />;
}

function typeClass(t: TypeId): string {
  return `type-${t}`;
}

function Play({
  snap,
  game,
  chat,
  setChat,
}: {
  snap: ReturnType<typeof getSnap>;
  game: TurbzGame | null;
  chat: string;
  setChat: (v: string) => void;
}) {
  const last = snap.chat[snap.chat.length - 1];
  return (
    <>
      <div className="vitals-dock px-panel">
        <p className="font-display text-xs text-kyo">
          {snap.name} · lv {snap.level} · score {snap.accountScore}
        </p>
        <div className="bar-track mt-1">
          <div className="h-full bg-blood" style={{ width: `${Math.max(0, Math.min(100, (snap.hp / Math.max(1, snap.maxHp)) * 100))}%` }} />
        </div>
        <p className="text-dim">
          {snap.hp}/{snap.maxHp} · {snap.kyo} kyo · {snap.region}
          {snap.shield > 0 ? ` · ward ${snap.shield}` : ""}
        </p>
        {snap.foe && <p className="text-kyo">{snap.foe}</p>}
        {snap.turn && <p className="text-dim">{snap.turn}</p>}
        {snap.autoplay && <p className="text-kyo">Autoplay · {snap.grind || "looking"}</p>}
        {snap.log[0] && <p>{snap.log[0]}</p>}
        {snap.shrine && <p className="text-kyo">{snap.shrine}</p>}
        {snap.roomCode && <p className="text-kyo">Lobby {snap.roomCode}</p>}
        <form
          className="mt-1"
          onSubmit={(e) => {
            e.preventDefault();
            game?.sendChat(chat);
            setChat("");
          }}
        >
          <input
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            placeholder={last ? `${last.name}: ${last.text}` : "Party chat"}
            aria-label="Party chat"
            autoComplete="off"
            suppressHydrationWarning
            className="w-full border-2 border-bone bg-ink px-2 py-1 text-bone outline-none"
          />
        </form>
      </div>
        {snap.survival && <div className="survival-hud">
          <button className="px-btn" onClick={() => game?.toggle("survival")}>Survival & Camp</button>
          <p>Hunger {Math.ceil(snap.survival.hunger)} · Thirst {Math.ceil(snap.survival.thirst)} · Sleep {Math.ceil(snap.survival.rest)}</p>
          {Math.min(snap.survival.hunger, snap.survival.thirst, snap.survival.rest) < 15 && <p className="text-blood">Supplies low. Empty reserves cause lasting damage.</p>}
          {snap.sleeping && <button className="px-btn" onClick={() => game?.survivalAction("sleep")}>Sleeping · Wake up</button>}
        </div>}

      {snap.hint && !snap.menu && !snap.panel && <div className="hint-chip px-panel">{snap.hint}</div>}
      {snap.duel && <DuelBanner duel={snap.duel} />}
      {snap.menu && (
        <div
          className="ctx-menu px-panel"
          style={{
            left: typeof window === "undefined" ? snap.menu.sx : Math.max(8, Math.min(snap.menu.sx, window.innerWidth - 340)),
            top: typeof window === "undefined" ? snap.menu.sy : Math.max(8, Math.min(snap.menu.sy, window.innerHeight - 240)),
          }}
        >
          <p className="font-display text-xs text-kyo">{snap.menu.title}</p>
          {snap.menu.lines.map((line) => (
            <p key={line} className="text-dim">
              {line}
            </p>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-1">
            {snap.menu.actions.map((action) => (
              <button key={action.id} className="px-btn" onClick={() => game?.menuAct(action.id)}>
                {action.label}
              </button>
            ))}
            <button className="px-btn" onClick={() => game?.clearMenu()}>
              Close
            </button>
          </div>
        </div>
      )}
      <div className="dock">
        <div className="move-row">
          {snap.bar.map((move, i) => (
            <button key={`${move.id}-${i}`} className="px-btn" title={snap.abilities.find(ability => ability.id === move.id)?.about} onClick={() => game?.cast(i)}>
              <span className={typeClass(move.type)}>{move.name}</span>
              <span className="block text-dim">{move.tag}</span>
              <span className="mt-1 block h-1 bg-ink">
                <span className="block h-full bg-kyo" style={{ width: `${Math.max(0, 100 - (move.cd / Math.max(0.05, move.max)) * 100)}%` }} />
              </span>
            </button>
          ))}
        </div>
      </div>
      <button
        className={`auto-fab px-btn ${snap.autoplay ? "px-btn-kyo" : ""}`}
        type="button"
        onClick={() => game?.toggleAutoplay()}
      >
        {snap.autoplay ? (snap.rules === "hardcore" ? "Stop grind" : "Stop auto") : snap.rules === "hardcore" ? "Grind nodes" : "Autoplay"}
      </button>
      <button className="menu-fab px-btn" type="button" onClick={() => game?.openShell(Math.max(8, window.innerWidth - 340), Math.max(8, window.innerHeight - 460))}>
        Menu
      </button>
      <Stick on={(x, y) => game?.setStick(x, y)} />
      {snap.panel && snap.panel !== "talk" && snap.panel !== "rebirth" && (
        <Panel title={snap.panel === "moves" ? "Verses · Attacks & Spells" : snap.panel} onClose={() => game?.closePanel()}>
          {snap.panel === "survival" && <Survival snap={snap} game={game} />}
          {snap.panel === "bag" && <Bag snap={snap} game={game} />}
          {snap.panel === "skills" && <Skills snap={snap} game={game} />}
          {snap.panel === "quests" && (
            <div>
              <p className="font-display text-xs text-kyo">{snap.questName}</p>
              <p>{snap.questAbout}</p>
              <p className="mt-2 text-dim">Skills and finished sets survive the veil. The body does not.</p>
              <p className="mt-2">Set {snap.setLabel}</p>
              <p className="text-dim">{snap.setBonus}</p>
              <p className="mt-2 text-dim">Unlocked sets: {snap.unlocked.length}</p>
            </div>
          )}
          {snap.panel === "map" && <Mini snap={snap} game={game} />}
          {snap.panel === "moves" && <Moves snap={snap} game={game} />}
          {snap.panel === "ghost" && <Ghost snap={snap} game={game} />}
          {snap.panel === "bounty" && (
            <div className="grid gap-2">
              <p className="font-display text-xs text-blood">WITCH HUNT</p>
              <p>{snap.bounty || "The board is blank. Take a name and the witch will know."}</p>
              {snap.bountyPlace && <p className="text-dim">Last seen toward {snap.bountyPlace}.</p>}
              <p className="text-dim">If you are slow, she comes for you. She drops her bag, her kyo, and every piece she wears.</p>
              <button className="px-btn px-btn-kyo" onClick={() => game?.takeBounty()}>
                Take the hunt
              </button>
            </div>
          )}
          {snap.panel === "pause" && (
            <div className="grid gap-2">
              <p>
                WASD / arrows: move. E: interact or gather. 1–9: cast. B/I: Bag. V: Verses. K: Skills. M: Map. H: Hardcore Survival. Escape: close or pause. Right-click or Menu opens more actions. Chat and search fields stop movement while typing.
              </p>
              {snap.roomCode && <p className="text-kyo">Lobby {snap.roomCode}</p>}
              <UserButton />
              <button className="px-btn" onClick={() => game?.toTitle()}>
                Return to title
              </button>
            </div>
          )}
          {snap.panel === "trade" && snap.trade && (
            <div className="grid gap-2">
              <p>With {snap.trade.peer}</p>
              <p>You offer: {snap.trade.mine}</p>
              <p>They offer: {snap.trade.theirs}</p>
              <button className="px-btn" onClick={() => game?.offerSelected()}>
                Offer selected gear
              </button>
              <button className="px-btn" onClick={() => game?.lockTrade()}>
                {snap.trade.me ? "Unlock" : "Lock in"}
                {snap.trade.them ? " · they are ready" : ""}
              </button>
            </div>
          )}
        </Panel>
      )}
      {snap.panel === "talk" && snap.talk && (
        <div className="talk-card">
          <div className="px-panel max-h-[50dvh] overflow-auto p-3">
            <p className="font-display text-xs text-kyo">
              {snap.talk.name} · {snap.talk.role}
            </p>
            <p className="mt-2">{snap.talk.line}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="px-btn" onClick={() => game?.nextLine()}>
                More
              </button>
              {snap.talk.shrine && (
                <button className="px-btn px-btn-kyo" onClick={() => game?.startShrine(snap.talk!.shrine!)}>
                  Enter shrine
                </button>
              )}
              {snap.talk.id === "orien" && (
                <button className="px-btn" onClick={() => game?.teach()}>
                  Learn verse · 35
                </button>
              )}
              {snap.talk.id === "holt" && (
                <button className="px-btn" onClick={() => game?.turnSalt()}>
                  Turn in salt
                </button>
              )}
              <button className="px-btn" onClick={() => game?.closePanel()}>
                Leave
              </button>
            </div>
            {snap.talk.shop === "general" && (
              <div className="mt-3 grid gap-1">
                {snap.wares.map((ware) => (
                  <button key={ware.id} className="px-btn" onClick={() => game?.buyItem(ware.id)}>
                    {ware.name} · {ware.price} kyo
                  </button>
                ))}
              </div>
            )}
            {(snap.talk.shop === "armor" || snap.talk.shop === "fence") && (
              <div className="mt-3 grid gap-1">
                {snap.stock.map((item) => (
                  <button key={item.uid} className="px-btn" onClick={() => game?.buyGear(item.uid)}>
                    {item.name} · {item.price}
                  </button>
                ))}
                {snap.talk.shop === "fence" && (
                  <button className="px-btn" onClick={() => snap.selected && game?.sell(snap.selected)}>
                    Sell selected gear
                  </button>
                )}
              </div>
            )}
            {snap.talk.shop === "alchemy" && (
              <div className="mt-3 grid gap-1">
                <button className="px-btn" onClick={() => game?.brew("warmth")}>
                  Warmth tonic · spore + embercap
                </button>
                <button className="px-btn" onClick={() => game?.brew("ward")}>
                  Ironroot phial · root + shroom
                </button>
                <button className="px-btn" onClick={() => game?.brew("eye")}>
                  Cat's eye · spore + lantern
                </button>
              </div>
            )}
            {snap.talk.id === "bram" && (
              <button className="px-btn mt-2" onClick={() => game?.brew("meal")}>
                Cook a fish
              </button>
            )}
          </div>
        </div>
      )}
      {snap.panel === "rebirth" && <Rebirth snap={snap} game={game} />}
    </>
  );
}

function Rebirth({ snap, game }: { snap: ReturnType<typeof getSnap>; game: TurbzGame | null }) {
  const [name, setName] = useState("Mira");
  const [classId, setClassId] = useState<ClassId>("warden");
  const race = CLASS_RACE[classId];
  const [setId, setSetId] = useState<string | null>(null);
  const owned = snap.unlocked.filter((s) => s.race === race);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-auto bg-ink/85 p-3">
      <div className="px-panel max-h-[88dvh] w-full max-w-3xl overflow-auto p-4">
        <p className="font-display text-xs text-blood">THE VEIL</p>
        <h2 className="font-display mt-2 text-sm">Choose the next witch</h2>
        <p className="text-dim">This body is gone. Account Score, skills, perks, and finished sets stay. You wake in another tavern.</p>
        <label className="mt-3 block text-dim">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 16))}
            className="mt-1 w-full border-2 border-bone bg-ink px-3 py-2 text-bone outline-none"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CLASSES.map((r) => (
            <button
              key={r.id}
              className={`border-2 p-2 text-left ${classId === r.id ? "border-kyo bg-ink" : "border-bone bg-ink"}`}
              onClick={() => {
                setClassId(r.id);
                setSetId(null);
              }}
            >
              <span className="font-display block text-xs">{r.name}</span>
              <span className={typeClass(r.type)}>{TYPES[r.type].name}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 font-display text-xs text-kyo">Spawn clothes</p>
        <div className="mt-2 grid gap-2">
          <button className={`px-btn ${setId === null ? "border-kyo" : ""}`} onClick={() => setSetId(null)}>
            Default witch robes
          </button>
          {owned.length === 0 && <p className="text-dim">No finished {RACES.find((r) => r.id === race)?.name} set yet. Find every piece once.</p>}
          {owned.map((s) => (
            <button key={s.id} className={`px-btn text-left ${setId === s.id ? "border-kyo" : ""}`} onClick={() => setSetId(s.id)}>
              {s.name}
              <span className="mt-1 block text-dim">{s.bonus}</span>
            </button>
          ))}
        </div>
        <button className="px-btn px-btn-kyo mt-4" onClick={() => game?.rebirth(name, race, setId, classId)}>
          Wake at a new tavern
        </button>
      </div>
    </div>
  );
}

function Stick({ on }: { on: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  function at(e: React.PointerEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * 2 - 1;
    const y = ((e.clientY - box.top) / box.height) * 2 - 1;
    const len = Math.hypot(x, y) || 1;
    on(len > 1 ? x / len : x, len > 1 ? y / len : y);
  }
  return (
    <div
      ref={ref}
      className="stick-wrap"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        at(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) at(e);
      }}
      onPointerUp={() => on(0, 0)}
      aria-label="Move stick"
    />
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="panel-drawer">
      <div className="px-panel panel-scroll h-full p-4" role="region" aria-label={title}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-xs text-kyo">{title}</h2>
          <button className="px-btn" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Bag({ snap, game }: { snap: ReturnType<typeof getSnap>; game: TurbzGame | null }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const term = search.trim().toLowerCase();
  const items = snap.bag.filter(item => item.name.toLowerCase().includes(term));
  const gear = snap.gear.filter(piece => `${piece.name} ${piece.slot} ${piece.quality}`.toLowerCase().includes(term)).slice().sort((a, b) => Number(snap.equipped.includes(b.uid)) - Number(snap.equipped.includes(a.uid)) || a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name));
  const count = (id: string) => snap.bag.find(item => item.id === id)?.count ?? 0;
  return (
    <div className="grid gap-4">
      <div className="inventory-tools">
        <input className="px-input" aria-label="Search inventory" placeholder="Search items, gear or slot" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="px-input" aria-label="Inventory category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">Everything</option><option value="items">Items</option><option value="gear">Gear</option></select>
        {search && <button className="px-btn" onClick={() => setSearch("")}>Clear search</button>}
      </div>
      <div>
        <p className="font-display text-xs">Worn · {snap.setLabel}</p>
        <p className="text-dim">{snap.setBonus}</p>
        <ul className="mt-2">
          {snap.totals.map((row) => (
            <li key={row.id}>
              {row.name} {row.power}
            </li>
          ))}
          {snap.totals.length === 0 && <li className="text-dim">Equipment provides fixed damage and armor.</li>}
        </ul>
        {category !== "gear" && <div className="mt-3 grid gap-1">
          <p className="text-kyo">Items · {items.length} stacks</p>
          {!items.length && <p className="text-dim">{term ? "No matching items." : "Your bag is empty."}</p>}
          {items.map((item) => (
            <button key={item.id} className="px-btn text-left" disabled={!!item.useProblem} title={item.useProblem ?? item.about} onClick={() => game?.useBag(item.id)}>
              {item.name} x{item.count}
              <span className="mt-1 block text-dim">{item.about}</span>
              {item.useProblem && <span className="block text-dim">{item.useProblem}</span>}
            </button>
          ))}
        </div>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button className="px-btn" disabled={count("leather") < 10 || count("mushroom") < 10} onClick={() => game?.craftGear()}>
            Craft · Leather {count("leather")}/10 · Mushroom {count("mushroom")}/10
          </button>
          <button className="px-btn" onClick={() => game?.sellMats()}>
            {snap.rules === "hardcore" ? "Sell hides & ore · Keep survival supplies" : "Sell gathered materials"}
          </button>
        </div>
      </div>
      {category !== "items" && <div className="grid gap-1">
        <p className="text-kyo">Gear · Worn first</p>
        {!gear.length && <p className="text-dim">No matching gear.</p>}
        {gear.map((piece) => (
          <button
            key={piece.uid}
            className={`px-btn text-left ${snap.selected === piece.uid ? "border-kyo" : ""}`}
            onClick={() => game?.select(piece.uid)}
          >
            {piece.name}
            <span className="mt-1 block text-dim">
              {piece.slot} · {piece.quality} · {equipmentStats(piece).damage ? `Damage ${equipmentStats(piece).damage}` : `Armor ${equipmentStats(piece).armor}`}
              {snap.equipped.includes(piece.uid) ? " · worn" : ""}
            </span>
          </button>
        ))}
        {snap.selected && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className="px-btn px-btn-kyo" onClick={() => game?.equip(snap.selected!)}>
              Wear
            </button>
            <button className="px-btn" disabled={snap.equipped.includes(snap.selected)} onClick={() => game?.sell(snap.selected!)}>
              {snap.equipped.includes(snap.selected) ? "Worn · Equip a replacement to sell" : "Sell"}
            </button>

          </div>
        )}
        {snap.stash.length > 0 && (
          <div className="mt-2 grid gap-1">
            {snap.stash.map((line, i) => (
              <button key={`${line}-${i}`} className="px-btn" onClick={() => game?.applyStash(i)}>
                Apply {line}
              </button>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}

function Skills({ snap, game }: { snap: ReturnType<typeof getSnap>; game: TurbzGame | null }) {
  return (
    <div className="grid gap-3">
      <p className="text-kyo">{snap.skillPoints} character skill points. Spend them in Attacks & Spells.</p>
      <p>
        Account {snap.accountLevel} · {snap.accountXp}/{snap.accountNeed} · {snap.perkPoints} perk points
      </p>
      <p className="text-kyo">Account Score {snap.accountScore}. Kept forever when a witch dies.</p>
      <div className="bar-track">
        <div className="h-full bg-kyo" style={{ width: `${Math.min(100, (snap.accountXp / Math.max(1, snap.accountNeed)) * 100)}%` }} />
      </div>
      <p className="text-dim">Each account level gives 5 points. They are permanent enchantments on every witch you become.</p>
      <div className="grid gap-1">
        {snap.perks.map((perk) => (
          <button key={perk.id} className="px-btn text-left" disabled={snap.perkPoints < 1} onClick={() => game?.spendPerk(perk.id)}>
            {perk.name} {perk.power}
            <span className="mt-1 block text-dim">{perk.about}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-1">
        {snap.skills.map((sk) => (
          <p key={sk.id}>
            <span className="text-kyo">
              {sk.name} {sk.level}
            </span>
            <span className="text-dim">
              {" "}
              · {sk.xp}/{sk.need} · {sk.line}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Moves({ snap, game }: { snap: ReturnType<typeof getSnap>; game: TurbzGame | null }) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  return <div className="grid gap-3"><p className="text-kyo">{snap.skillPoints} skill points · +3 each character level</p><p className="text-dim">Hover, focus, or tap a Verse to read its effect. Unlock or upgrade for 1 point, up to rank 5. Each upgrade adds 15% damage, healing or shield strength.</p><input className="px-input" aria-label="Search abilities" placeholder="Search attacks and spells" value={filter} onChange={e => setFilter(e.target.value)} />{snap.abilities.filter(m => m.name.toLowerCase().includes(filter.toLowerCase())).map(move => <div className="px-panel verse-card p-3" key={move.id}>
    <button className={`verse-name ${typeClass(move.type)}`} aria-expanded={expanded === move.id} aria-describedby={`verse-${move.id}`} onClick={() => setExpanded(expanded === move.id ? null : move.id)}>{move.name} · {move.rank ? `Rank ${move.rank}/5` : "Locked"}</button>
    <div id={`verse-${move.id}`} className={`verse-description ${expanded === move.id ? "verse-open" : ""}`}><p>{move.about}</p><p className="text-dim">Power {move.power} · Accuracy {move.accuracy}% · Critical {move.crit}% · Range {move.range} · Effect {move.effect}</p></div>
    <button className="px-btn mt-2" disabled={snap.skillPoints < 1 || move.rank >= 5} onClick={() => game?.spendAbility(move.id)}>{move.rank >= 5 ? "Max rank" : move.rank ? "Upgrade · 1 point" : "Unlock · 1 point"}</button></div>)}</div>;
}

function Survival({ snap, game }: { snap: ReturnType<typeof getSnap>; game: TurbzGame | null }) {
  if (!snap.survival) return null;
  const bag = Object.fromEntries(snap.bag.map(item => [item.id, item.count]));
  const count = (id: string) => bag[id] ?? 0;
  const food = bestFood(bag, snap.survival.hunger);
  return <div className="grid gap-3">
    <p className="text-kyo">Frontier Survival</p>
    <p>Logs {count('timber')} · Raw meat {count('meat')} · Fish {count('fish')} · Raw water {count('raw_water')}</p>
    <div className="grid grid-cols-2 gap-2"><button className="px-btn" disabled={!food} onClick={() => game?.eatFood()}>{food ? `Eat ${snap.bag.find(item => item.id === food)?.name}` : 'No meal needed / stocked'}</button><button className="px-btn" disabled={!count('drinking_water') || snap.survival.thirst >= 100} onClick={() => game?.useBag('drinking_water')}>Drink purified water · {count('drinking_water')}</button></div>
    {[['Hunger', snap.survival.hunger], ['Thirst', snap.survival.thirst], ['Sleep', snap.survival.rest]].map(([name, value]) => <label key={name}>{name} · {Math.ceil(Number(value))}/100<progress className="survival-meter" max={100} value={value} /></label>)}
    <p className="text-dim">Full reserves last 30 minutes of food, 20 of water, and 40 of sleep during active play. Empty reserves damage you; low sleep slows movement. Pause and hidden tabs stop the clock.</p>
    <p>Injuries persist until a healing spell is used. Meals, sleep, potions, level-ups and hearths do not heal.</p>
    <button className="px-btn" disabled={!snap.nearTree} onClick={() => game?.survivalAction('chop')}>Chop nearby tree → Logs</button>
    <button className="px-btn" disabled={!snap.nearWater} onClick={() => game?.survivalAction('water')}>Harvest water · Stand by a water tile</button>
    <button className="px-btn" disabled={snap.nearCamp || count('timber') < 3} onClick={() => game?.survivalAction('fire')}>Build campfire · 3 logs</button>
    <p className="text-kyo">{snap.nearCamp ? 'Campfire within reach' : 'Stand beside a campfire to cook, purify, or sleep'}</p>
    <button className="px-btn" disabled={!snap.nearCamp || count('meat') < 1 || count('timber') < 1} onClick={() => game?.survivalAction('cook')}>Cook · 1 raw meat + 1 log</button>
    <button className="px-btn" disabled={!snap.nearCamp || count('fish') < 1 || count('timber') < 1} onClick={() => game?.survivalAction('fish')}>Cook fish · 1 raw fish + 1 log</button>
    <button className="px-btn" disabled={!snap.nearCamp || count('raw_water') < 1 || count('timber') < 1} onClick={() => game?.survivalAction('purify')}>Purify · 1 raw water + 1 log</button>
    <button className="px-btn" disabled={!snap.nearCamp} onClick={() => game?.survivalAction('sleep')}>{snap.sleeping ? 'Wake up' : 'Sleep · About 13 seconds for a full rest'}</button>
    <p className="text-dim">Use meals and drinking water from Bag. Holt sells rations and cooked meat. Hunt animals for raw meat. Look for LOGS markers, including the grove beside the hearth.</p>
    <button className="px-btn" onClick={() => game?.toggle('bag')}>Open Bag · Eat / Drink</button>
  </div>;
}

function Ghost({ snap, game }: { snap: ReturnType<typeof getSnap>; game: TurbzGame | null }) {
  return (
    <div className="grid gap-2">
      <p>{snap.companion}</p>
      <p className="text-dim">Kills can recruit a spirit. A full party of three keeps the stronger ones. Dead spirits sit out the next turns.</p>
      {snap.box.map((line, i) => (
        <button key={`${line}-${i}`} className="px-btn" onClick={() => game?.summonBox(i)}>
          Call {line}
        </button>
      ))}
    </div>
  );
}

function Mini({ snap, game }: { snap: ReturnType<typeof getSnap>; game: TurbzGame | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !game) return;
    game.drawMap(canvas);
  }, [game, snap.mapX, snap.mapY, snap.map, JSON.stringify(snap.dungeonPortals), JSON.stringify(snap.survival?.campfires)]);
  return <div className="grid gap-3"><p className="text-kyo">Next dungeon in {Math.floor(snap.dungeonCountdown / 60)}:{String(snap.dungeonCountdown % 60).padStart(2, "0")} of active play.</p><canvas ref={ref} className="map-canvas" aria-label="World map" />{snap.dungeonPortals.filter(p => !p.cleared).map(p => <button className="px-btn" key={p.id} disabled={snap.map !== "world"} onClick={() => game?.trackRift(p.id)}>Track / enter Dungeon {p.id.slice(5)}</button>)}</div>;
}
