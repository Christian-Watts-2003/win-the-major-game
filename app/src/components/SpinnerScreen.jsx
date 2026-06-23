import { useState, useRef, useCallback, useEffect } from "react";
import {
  spinValidTeamMajor, spinValidCS2TeamMajor,
  spinTeamKeepMajor, spinMajorKeepTeam,
  TEAM_MAJORS,
} from "../lib/draftData";
import { SPIN_DURATION_MS, SPIN_DECOY_COUNT, SPIN_TEAM_OFFSET_MS, SPIN_RESULT_DWELL_MS } from "../config";

const REEL_ROW_H = 80;
const ALL_MAJORS = [...new Set(TEAM_MAJORS.map((t) => t.major))];
const ALL_ORGS   = [...new Set(TEAM_MAJORS.map((t) => t.org))];

// spinPhase: "idle" | "spinning" | "major-settled" | "landed"

export default function SpinnerScreen({
  pickNumber, totalPicks,
  rerollConstraint,
  onResolved, excludeIds,
  gameMode = "classic",
}) {
  const [spinPhase, setSpinPhase]     = useState("idle");
  const [teamStarted, setTeamStarted] = useState(false);
  const [majorDecoys, setMajorDecoys] = useState([]);
  const [teamDecoys, setTeamDecoys]   = useState([]);
  const [landedMajor, setLandedMajor] = useState(null);
  const [landedResult, setLandedResult] = useState(null);
  const timers = useRef([]);
  const firedConstraint = useRef(false);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);

  const runSpin = useCallback((getResult) => {
    clearTimers();
    setSpinPhase("spinning");
    setTeamStarted(false);
    setLandedMajor(null);
    setLandedResult(null);

    const result = getResult();

    // Major reel decoys
    const mDecoys = Array.from({ length: SPIN_DECOY_COUNT }, () =>
      ALL_MAJORS[Math.floor(Math.random() * ALL_MAJORS.length)]
    );
    mDecoys.push(result.major);
    setMajorDecoys(mDecoys);

    // Team reel decoys (all orgs — decoys are just visual noise)
    const tDecoys = Array.from({ length: SPIN_DECOY_COUNT }, () =>
      ALL_ORGS[Math.floor(Math.random() * ALL_ORGS.length)]
    );
    tDecoys.push(result.org);
    setTeamDecoys(tDecoys);

    // Team reel starts after offset
    timers.current.push(setTimeout(() => setTeamStarted(true), SPIN_TEAM_OFFSET_MS));

    // Major settles
    timers.current.push(setTimeout(() => {
      setLandedMajor(result.major);
      setSpinPhase("major-settled");
    }, SPIN_DURATION_MS));

    // Team reel settles — show both locked reels
    timers.current.push(setTimeout(() => {
      setLandedResult(result);
      setSpinPhase("landed");
    }, SPIN_DURATION_MS + SPIN_TEAM_OFFSET_MS));

    // Hold the result on screen, then navigate to draft
    timers.current.push(setTimeout(() => {
      onResolved(result);
    }, SPIN_DURATION_MS + SPIN_TEAM_OFFSET_MS + SPIN_RESULT_DWELL_MS));
  }, [excludeIds, onResolved]);

  // Auto-fire reroll constraints when returning from DraftScreen
  useEffect(() => {
    if (!rerollConstraint || firedConstraint.current) return;
    firedConstraint.current = true;
    const exclude = rerollConstraint.excludeId
      ? [...excludeIds, rerollConstraint.excludeId]
      : excludeIds;
    const isHltv3 = gameMode === "hltv3";
    if (rerollConstraint.type === "team") {
      runSpin(() => spinTeamKeepMajor(rerollConstraint.major, exclude, Math.random, isHltv3) ?? spinValidCS2TeamMajor(Math.random, exclude));
    } else {
      runSpin(() => spinMajorKeepTeam(rerollConstraint.org, exclude, Math.random, isHltv3) ?? spinValidCS2TeamMajor(Math.random, exclude));
    }
  }, [rerollConstraint, runSpin, excludeIds]);

  const handleInitialSpin = () => {
    if (gameMode === "hltv3") {
      runSpin(() => spinValidCS2TeamMajor(Math.random, excludeIds));
    } else {
      runSpin(() => spinValidTeamMajor(Math.random, excludeIds));
    }
  };

  const isActive = spinPhase === "spinning" || spinPhase === "major-settled";
  const accent   = gameMode === "hltv3" ? "green" : "orange";

  return (
    <div className="rounded-sm border border-broadcast-line bg-broadcast-panel">
      <ScreenHeader pickNumber={pickNumber} totalPicks={totalPicks} gameMode={gameMode} />

      <div className="px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-md space-y-4">

          {/* ── Major reel ──────────────────────────────────────────── */}
          <div>
            <ReelLabel
              label="Major"
              phase={
                spinPhase === "major-settled" || spinPhase === "landed" ? "locked"
                : spinPhase === "spinning" ? "spinning"
                : "idle"
              }
            />
            <ReelWindow
              decoys={majorDecoys}
              spinning={spinPhase === "spinning"}
              landed={landedMajor}
              rowHeight={REEL_ROW_H}
              placeholder="— major —"
              accent={accent}
              renderEntry={(text) => (
                <div className="text-center px-4">
                  <div className="font-display text-lg font-black uppercase tracking-tight text-broadcast-muted-2 leading-tight">
                    {text}
                  </div>
                </div>
              )}
              renderLanded={(text) => (
                <div className="text-center px-4">
                  <div className={`font-display text-xl font-black uppercase tracking-tight leading-tight ${accent === "green" ? "text-broadcast-green" : "text-broadcast-orange"}`}>
                    {text}
                  </div>
                </div>
              )}
            />
          </div>

          {/* ── Team reel ───────────────────────────────────────────── */}
          <div>
            <ReelLabel
              label="Team"
              phase={
                spinPhase === "landed" ? "locked"
                : teamStarted ? "spinning"
                : "idle"
              }
            />
            <ReelWindow
              decoys={teamDecoys}
              spinning={teamStarted && spinPhase !== "landed"}
              landed={landedResult ? landedResult.org : null}
              rowHeight={REEL_ROW_H}
              placeholder="— team —"
              accent={accent}
              renderEntry={(text) => (
                <div className="text-center px-4">
                  <div className="font-display text-3xl font-black uppercase tracking-tight text-broadcast-muted-2">
                    {text}
                  </div>
                </div>
              )}
              renderLanded={(text) => (
                <div className="text-center px-4">
                  <div className={`font-display text-4xl font-black uppercase tracking-tight ${accent === "green" ? "text-broadcast-green" : "text-broadcast-orange"}`}>
                    {text}
                  </div>
                </div>
              )}
            />
          </div>

          {/* ── Spin button ─────────────────────────────────────────── */}
          {!isActive && spinPhase === "idle" && !rerollConstraint && (
            <button
              onClick={handleInitialSpin}
              className={`mt-2 w-full rounded-sm px-6 py-4 font-display text-xl font-bold uppercase tracking-wide text-broadcast-bg transition hover:bg-white ${
                accent === "green" ? "bg-broadcast-green" : "bg-broadcast-orange"
              }`}
            >
              Spin for pick {pickNumber}
            </button>
          )}

          {/* Loading label after both reels land */}
          {spinPhase === "landed" && (
            <div className="pt-1 text-center font-mono text-xs uppercase tracking-widest text-broadcast-muted animate-pulse-glow">
              Loading roster…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReelLabel({ label, phase }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">{label}</span>
      {phase === "locked" && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-broadcast-green">✓ Locked</span>
      )}
      {phase === "spinning" && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-broadcast-orange animate-pulse-glow">
          Spinning…
        </span>
      )}
    </div>
  );
}

function ReelWindow({ decoys, spinning, landed, rowHeight, placeholder, accent, renderEntry, renderLanded }) {
  const finalOffset = (decoys.length - 1) * rowHeight;
  const activeBorder = accent === "green" ? "border-broadcast-green" : "border-broadcast-orange";

  return (
    <div
      className={`relative overflow-hidden rounded-sm border-2 bg-broadcast-bg transition-colors duration-300 ${
        spinning || landed ? activeBorder : "border-broadcast-line"
      }`}
      style={{ height: rowHeight }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-broadcast-bg to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-broadcast-bg to-transparent" />

      {spinning ? (
        <div
          className="reel-track"
          style={{ "--final-offset": `-${finalOffset}px`, animationDuration: `${decoys.length * 0.11}s` }}
        >
          {decoys.map((text, i) => (
            <div key={i} style={{ height: rowHeight }} className="flex items-center justify-center">
              {renderEntry(text)}
            </div>
          ))}
        </div>
      ) : landed ? (
        <div className="flex h-full items-center justify-center">
          {renderLanded(landed)}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-sm text-broadcast-muted">
          {placeholder}
        </div>
      )}
    </div>
  );
}

function ScreenHeader({ pickNumber, totalPicks, gameMode }) {
  return (
    <div className="flex items-center gap-3 border-b border-broadcast-line px-6 py-4 sm:px-10">
      <div className="shrink-0 font-mono text-xs uppercase tracking-widest text-broadcast-muted">
        Pick {pickNumber} / {totalPicks}
      </div>
      <div className="h-4 w-px shrink-0 bg-broadcast-line" />
      <div className={`shrink-0 font-display text-lg font-bold uppercase ${gameMode === "hltv3" ? "text-broadcast-green" : "text-broadcast-orange"}`}>
        Spin for a roster
      </div>
      {gameMode === "hltv3" && (
        <div className="shrink-0 rounded-sm border border-broadcast-green/40 bg-broadcast-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-broadcast-green">
          CS2 Era
        </div>
      )}
    </div>
  );
}
