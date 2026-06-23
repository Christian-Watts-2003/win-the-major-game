import { useState, useEffect, useRef } from "react";
import { createTournamentRunner } from "../lib/tournament";
import { TEAM_MAJORS } from "../lib/draftData";

const REVEAL_DELAY_MS = 900;

const STAGE_ORDER = ["stage1", "stage2", "stage3", "playoff"];
const STAGE_LABELS = {
  stage1:  "Opening Stage",
  stage2:  "Challengers Stage",
  stage3:  "Legends Stage",
  playoff: "Playoffs",
};

export default function TournamentBracket({ strength, gameMode, onRestart }) {
  const [rounds, setRounds] = useState([]);
  const [finalState, setFinalState] = useState(null); // { champion, eliminatedStage }
  const [pending, setPending] = useState(true);
  const runner = useRef(null);

  // Create runner once on mount
  if (!runner.current) {
    runner.current = createTournamentRunner(strength, TEAM_MAJORS, gameMode);
  }

  useEffect(() => {
    if (finalState) return;
    setPending(true);
    const timer = setTimeout(() => {
      const step = runner.current.next();
      if (!step) return;
      setRounds((prev) => [...prev, step.round]);
      setPending(false);
      if (step.done) {
        setFinalState({ champion: step.champion, eliminatedStage: step.eliminatedStage });
      }
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rounds, finalState]);

  const champion = finalState?.champion ?? null;
  const allRevealed = !!finalState;

  // Group rounds by stage key
  const byStage = {};
  for (const stageKey of STAGE_ORDER) byStage[stageKey] = [];
  for (const r of rounds) {
    const key = r.stage === "group" ? r.stage.replace("group", r.round.id.split("_")[0]) : r.stage;
    // Use stageId directly from the round
    const stageKey = r.stage === "playoff" ? "playoff" : r.stage;
    if (!byStage[stageKey]) byStage[stageKey] = [];
    byStage[stageKey].push(r);
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="font-mono text-xs uppercase tracking-widest text-broadcast-muted">
        Tournament result
      </div>

      {allRevealed && (
        <div className={`font-display text-5xl font-black uppercase tracking-tight sm:text-6xl ${champion ? "text-broadcast-green" : "text-broadcast-text"}`}>
          {champion ? "Major Champion" : `Eliminated — ${finalState.eliminatedStage}`}
        </div>
      )}

      {champion && allRevealed && (
        <div className="rounded-sm border border-broadcast-green/40 bg-broadcast-green/10 px-6 py-3 font-display text-xl font-black uppercase text-broadcast-green">
          Cleared every stage. GOAT lineup confirmed.
        </div>
      )}

      {pending && !allRevealed && (
        <div className="font-mono text-sm uppercase tracking-widest text-broadcast-orange animate-pulse">
          Playing next match…
        </div>
      )}

      <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STAGE_ORDER.map((stageKey) => {
          const stageRounds = byStage[stageKey] ?? [];
          // Show "Playing…" pulse in the stage currently being simulated
          // The active stage is the one the last-played round belongs to,
          // or "stage1" if nothing has been played yet.
          const lastRound = rounds[rounds.length - 1];
          const activeStageKey = lastRound ? lastRound.stage : "stage1";
          const isActiveStage = !allRevealed && pending && stageKey === activeStageKey;
          return (
            <StageColumn
              key={stageKey}
              stageKey={stageKey}
              title={STAGE_LABELS[stageKey]}
              rounds={stageRounds}
              activeStagePending={isActiveStage}
            />
          );
        })}
      </div>

      {allRevealed && (
        <button
          onClick={onRestart}
          className="mt-2 rounded-sm border border-broadcast-line px-8 py-4 font-display text-lg font-bold uppercase tracking-wide text-broadcast-muted-2 transition hover:border-broadcast-orange hover:text-broadcast-orange"
        >
          Build another lineup
        </button>
      )}
    </div>
  );
}

function StageColumn({ stageKey, title, rounds, activeStagePending }) {
  const isPlayoff = stageKey === "playoff";
  return (
    <div className={`flex flex-col gap-3 rounded-sm border p-4 ${isPlayoff ? "border-broadcast-orange/30 bg-broadcast-orange/5" : "border-broadcast-line bg-broadcast-bg/40"}`}>
      <div className={`text-left font-mono text-[10px] uppercase tracking-widest ${isPlayoff ? "text-broadcast-orange" : "text-broadcast-muted"}`}>
        {title}
      </div>
      {rounds.length === 0 && !activeStagePending ? (
        <div className="rounded-sm border border-dashed border-broadcast-line px-4 py-4 text-left opacity-30">
          <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">Not reached</div>
        </div>
      ) : (
        <>
          {rounds.map((r) => <RoundCard key={r.round.id} roundResult={r} />)}
          {activeStagePending && (
            <div className="animate-pulse rounded-sm border border-dashed border-broadcast-orange/40 bg-broadcast-panel-raised px-4 py-4 text-left">
              <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">Next match</div>
              <div className="mt-2 font-display text-base font-bold uppercase text-broadcast-orange">Playing…</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RoundCard({ roundResult }) {
  const { round, opponent, match } = roundResult;
  const won = match.won;

  return (
    <div className={`group relative rounded-sm border px-4 py-4 text-left transition-all duration-300 ${won ? "border-broadcast-green/40 bg-broadcast-green/5" : "border-broadcast-red/40 bg-broadcast-red/5"}`}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-orange">{round.label}</div>
        <span className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${won ? "bg-broadcast-green/15 text-broadcast-green" : "bg-broadcast-red/15 text-broadcast-red"}`}>
          {won ? "Win" : "Loss"}
        </span>
      </div>
      <div className="mt-2 font-display text-lg font-black uppercase leading-tight">{match.score}</div>
      <div className="mt-1 text-xs text-broadcast-muted-2">
        vs {opponent.teamMajor.org} <span className="text-broadcast-muted">· {opponent.teamMajor.major}</span>
      </div>
      <div className="mt-1 font-mono text-[10px] text-broadcast-muted">
        Strength {opponent.strength.toFixed(1)} <span className="text-broadcast-muted/50">— hover for lineup</span>
      </div>

      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-64 rounded-sm border border-broadcast-line bg-broadcast-panel p-3 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-broadcast-orange">
          {opponent.teamMajor.org} · {opponent.teamMajor.major}
        </div>
        <div className="mb-2 font-mono text-xs text-broadcast-muted">
          Strength: <span className="text-broadcast-text">{opponent.strength.toFixed(1)}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {opponent.lineup.map(({ roleId, player }) => (
            <div key={roleId} className="flex items-center gap-2">
              <span className="w-10 shrink-0 font-mono text-[9px] uppercase text-broadcast-muted">{roleId}</span>
              <span className="font-display text-xs font-bold uppercase">{player.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
