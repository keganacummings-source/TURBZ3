import { useEffect, useRef, useState, type ReactNode } from "react";
import { RACES, TYPES, type RaceId, type TypeId } from "@/game/content";
import { UserButton } from "@/lib/auth/gates";
import { DuelBanner } from "@/components/hub-ui";
import { getSnap, type TurbzGame } from "@/game/engine";

function typeClass(t: TypeId): string {
  return `type-${t}`;
}

export function Title(props: {
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
        <h1 className="font-display mt-3 text-lg text-bone sm:text-2xl">{hard ? "Skill grind" : "The hunt"}</h1>
        <p className="mt-3 text-dim">
          {hard
            ? "No cloud mercy. Skills stick. Bodies do not."
            : "Walk the wilds. Harvest nodes. Trade at the board. Die with your pockets open."}
        </p>
        <div className="mt-5 grid gap-2">
          {props.hasSave && (
            <button className="px-btn px-btn-kyo" type="button" onClick={props.onContinue}>
              Continue
            </button>
          )}
          <button className="px-btn" type="button" onClick={props.onNew}>
            New witch
          </button>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              className="px-input"
              value={props.code}
              onChange={(e) => props.setCode(e.target.value.toUpperCase())}
              placeholder="Lobby code"
              maxLength={8}
            />
            <button className="px-btn" type="button" onClick={props.onHost}>
              Host
            </button>
            <button className="px-btn" type="button" onClick={props.onJoin}>
              Join
            </button>
          </div>
          <button className="px-btn" type="button" onClick={props.onCircle}>
            TurboCircle{props.circleMarks != null ? ` · ${props.circleMarks}` : ""}
          </button>
          <button className="px-btn" type="button" onClick={props.onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export function Create(props: {
  name: string;
  setName: (v: string) => void;
  race: RaceId;
  setRace: (v: RaceId) => void;
  game: TurbzGame | null;
  onBack: () => void;
  onGo: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !props.game) return;
    props.game.preview(canvas, props.race);
  }, [props.game, props.race]);
  return (
    <div className="flex h-full items-center justify-center overflow-auto p-3 pb-20">
      <div className="px-panel w-full max-w-3xl p-4">
        <p className="font-display text-xs text-blood">NEW WITCH</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-[160px_1fr]">
          <canvas ref={canvasRef} width={140} height={180} className="mx-auto rounded border border-black/40 bg-black/40" />
          <div>
            <label className="grid gap-1 text-sm">
              Name
              <input className="px-input" value={props.name} onChange={(e) => props.setName(e.target.value)} maxLength={16} />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RACES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`px-btn text-left text-xs ${props.race === r.id ? "px-btn-kyo" : ""}`}
                  onClick={() => props.setRace(r.id)}
                >
                  <span className="font-display block">{r.name}</span>
                  <span className={`block ${typeClass(r.type)}`}>{TYPES[r.type].name}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-dim text-xs">{RACES.find((r) => r.id === props.race)?.blurb}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="px-btn px-btn-kyo" type="button" onClick={props.onGo}>
                Begin
              </button>
              <button className="px-btn" type="button" onClick={props.onBack}>
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stick({ on }: { on: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let active = false;
    const set = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (clientX - cx) / (r.width / 2);
      const dy = (clientY - cy) / (r.height / 2);
      const m = Math.hypot(dx, dy) || 1;
      const s = Math.min(1, m);
      on((dx / m) * s, (dy / m) * s);
    };
    const up = () => {
      active = false;
      on(0, 0);
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      set(e.clientX, e.clientY);
    };
    const down = (e: PointerEvent) => {
      active = true;
      el.setPointerCapture(e.pointerId);
      set(e.clientX, e.clientY);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [on]);
  return <div ref={ref} className="stick-pad" aria-label="Move stick" />;
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="panel-layer">
      <div className="px-panel max-h-[70dvh] w-full max-w-lg overflow-auto p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-display text-xs text-kyo uppercase">{title}</p>
          <button className="px-btn text-xs" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Play({
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
          <div
            className="h-full bg-blood"
            style={{ width: `${Math.max(0, Math.min(100, (snap.hp / Math.max(1, snap.maxHp)) * 100))}%` }}
          />
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
            className="w-full border-2 border-bone bg-ink px-2 py-1 text-bone outline-none"
          />
        </form>
      </div>

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
          <div className="mt-2 flex flex-wrap gap-1">
            {snap.menu.actions.map((a) => (
              <button key={a.id} className="px-btn text-xs" type="button" onClick={() => game?.menuAct(a.id)}>
                {a.label}
              </button>
            ))}
            <button className="px-btn text-xs" type="button" onClick={() => game?.clearMenu()}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="verse-dock px-panel">
        {snap.bar.map((m) => (
          <button
            key={m.id}
            type="button"
            className="px-btn text-xs"
            disabled={m.cd > 0}
            onClick={() => game?.cast(m.id)}
            title={m.name}
          >
            <span className={typeClass(m.type)}>{m.name}</span>
            {m.cd > 0 ? ` ${Math.ceil(m.cd)}` : ""}
          </button>
        ))}
      </div>

      <button className="menu-fab px-btn" type="button" onClick={() => game?.toggleAutoplay()}>
        {snap.autoplay ? "Stop auto" : "Autoplay"}
      </button>
      <button
        className="menu-fab px-btn"
        type="button"
        style={{ right: 96 }}
        onClick={() => game?.openShell(Math.max(8, window.innerWidth - 340), Math.max(8, window.innerHeight - 460))}
      >
        Menu
      </button>
      <Stick on={(x, y) => game?.setStick(x, y)} />

      {snap.panel && snap.panel !== "talk" && snap.panel !== "rebirth" && (
        <Panel title={String(snap.panel)} onClose={() => game?.closePanel()}>
          {snap.panel === "bag" && (
            <div className="grid gap-2">
              <p className="font-display text-xs text-kyo">Bag & gear</p>
              {snap.bag.map((b) => (
                <button key={b.id} className="px-btn text-left text-xs" type="button" onClick={() => game?.useBag(b.id)}>
                  {b.name} ×{b.count}
                </button>
              ))}
              {snap.gear.map((g) => (
                <button key={g.uid} className="px-btn text-left text-xs" type="button" onClick={() => game?.equip(g.uid)}>
                  {g.name} {snap.equipped.includes(g.uid) ? "· on" : ""}
                </button>
              ))}
            </div>
          )}
          {snap.panel === "skills" && (
            <div className="grid gap-2">
              {snap.skills.map((s) => (
                <p key={s.id}>
                  {s.name} lv {s.level} — {s.line}
                </p>
              ))}
            </div>
          )}
          {snap.panel === "quests" && (
            <div>
              <p className="font-display text-xs text-kyo">{snap.questName}</p>
              <p>{snap.questAbout}</p>
              <p className="mt-2">Set {snap.setLabel}</p>
              <p className="text-dim">{snap.setBonus}</p>
            </div>
          )}
          {snap.panel === "moves" && (
            <div className="grid gap-1">
              {snap.known.map((m) => (
                <p key={m.id}>
                  <span className={typeClass(m.type)}>{m.name}</span>
                </p>
              ))}
            </div>
          )}
          {snap.panel === "ghost" && (
            <div className="grid gap-2">
              <p>{snap.companion}</p>
              {snap.box.map((line, i) => (
                <button key={`${line}-${i}`} className="px-btn" type="button" onClick={() => game?.summonBox(i)}>
                  Call {line}
                </button>
              ))}
            </div>
          )}
          {snap.panel === "bounty" && (
            <div className="grid gap-2">
              <p className="font-display text-xs text-blood">WITCH HUNT</p>
              <p>{snap.bounty || "The board is blank."}</p>
              <button className="px-btn px-btn-kyo" type="button" onClick={() => game?.takeBounty()}>
                Take the hunt
              </button>
            </div>
          )}
          {snap.panel === "pause" && (
            <div className="grid gap-2">
              <p>Right-click or Menu opens the veil. Walk near nodes to harvest.</p>
              {snap.roomCode && <p className="text-kyo">Lobby {snap.roomCode}</p>}
              <UserButton />
              <button className="px-btn" type="button" onClick={() => game?.toTitle()}>
                Return to title
              </button>
            </div>
          )}
          {snap.panel === "trade" && snap.trade && (
            <div className="grid gap-2">
              <p>Trade with {snap.trade.peer}</p>
              <button className="px-btn" type="button" onClick={() => game?.lockTrade()}>
                Lock trade
              </button>
            </div>
          )}
          {snap.panel === "map" && <p className="text-dim">World map panel.</p>}
        </Panel>
      )}

      {snap.panel === "talk" && snap.talk && (
        <div className="panel-layer">
          <div className="px-panel max-h-[50dvh] overflow-auto p-3">
            <p className="font-display text-xs text-kyo">
              {snap.talk.name} · {snap.talk.role}
            </p>
            <p className="mt-2">{snap.talk.line}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="px-btn" type="button" onClick={() => game?.nextLine()}>
                Continue
              </button>
              <button className="px-btn" type="button" onClick={() => game?.closePanel()}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
