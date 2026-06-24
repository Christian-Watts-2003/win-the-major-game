import { useState, useMemo } from "react";
import { computeStrengthBreakdown, computeStrengthBreakdownHltv3, getOpponentPool, getOpponentPoolHltv3 } from "../lib/simulation";
import { TEAM_MAJORS } from "../lib/draftData";
import StrengthBreakdown from "./StrengthBreakdown";
import RolePerformanceBreakdown from "./RolePerformanceBreakdown";
import TournamentBracket from "./TournamentBracket";

const SLOT_ORDER = ["awp", "entry", "support", "lurker", "igl"];
const SLOT_ORDER_HLTV3 = ["awp", "entry", "support", "star", "lurker"];

export default function ResultsScreen({ assignments, statsRevealed, onRestart, gameMode = "classic", iglPlayerId = null }) {
  const [started, setStarted] = useState(false);
  const isHltv3 = gameMode === "hltv3";

  const lineup = useMemo(
    () => (isHltv3 ? SLOT_ORDER_HLTV3 : SLOT_ORDER).map((roleId) => ({ roleId, player: assignments[roleId] })),
    [assignments, isHltv3]
  );

  const breakdown = useMemo(
    () => isHltv3 ? computeStrengthBreakdownHltv3(lineup, iglPlayerId) : computeStrengthBreakdown(lineup),
    [lineup, isHltv3, iglPlayerId]
  );

  // Warm the opponent pool cache so the first match doesn't stall.
  useMemo(() => {
    if (isHltv3) getOpponentPoolHltv3(TEAM_MAJORS);
    else getOpponentPool(TEAM_MAJORS);
  }, [isHltv3]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <StrengthBreakdown lineup={lineup} breakdown={breakdown} statsRevealed={true} gameMode={gameMode} />

      <div className="mt-6">
        <RolePerformanceBreakdown lineup={lineup} gameMode={gameMode} iglPlayerId={iglPlayerId} />
      </div>
      
      <div className="mt-6 rounded-sm border border-broadcast-line bg-broadcast-panel p-6 sm:p-10">
        {!started ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="font-mono text-xs uppercase tracking-widest text-broadcast-muted">
              Ready to find out
            </div>
            <h3 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Run the Major
            </h3>
            <p className="max-w-md text-sm text-broadcast-muted-2">
              Full Swiss format — first to 3 wins advances, 3 losses eliminates. Opponents
              get tougher as your record improves. Then a QF → SF → Grand Final bracket.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-2 rounded-sm bg-broadcast-orange px-8 py-4 font-display text-xl font-bold uppercase tracking-wide text-broadcast-bg transition hover:bg-white"
            >
              Run the Major
            </button>
          </div>
        ) : (
          <TournamentBracket
            strength={breakdown.finalStrength}
            gameMode={gameMode}
            onRestart={onRestart}
          />
        )}
      </div>
    </div>
  );
}
