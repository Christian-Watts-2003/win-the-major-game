import { useState, useCallback } from "react";
import { DndContext } from "@dnd-kit/core";
import ModeSelectScreen from "./components/ModeSelectScreen";
import SpinnerScreen from "./components/SpinnerScreen";
import DraftScreen from "./components/DraftScreen";
import LiveRosterBoard from "./components/LiveRosterBoard";
import ResultsScreen from "./components/ResultsScreen";
import IntroScreen from "./components/IntroScreen";
import { TOTAL_PICKS, SLOT_ORDER, SLOT_ORDER_HLTV3, MAX_REROLLS_TEAM, MAX_REROLLS_MAJOR } from "./config";
import relatedRosters from "./data/related-rosters.json";
import MathGuide from "./components/MathGuide";

export default function App() {
  // phase: intro | mode | spin | draft | results
  const [phase, setPhase] = useState("intro");
  const [statsRevealed, setStatsRevealed] = useState(true); // false = "CS Knowledge" mode (stats hidden, roles always shown)
  const [gameMode, setGameMode] = useState("classic"); // "classic" | "hltv3"
  const [pickIndex, setPickIndex] = useState(0); // 0-4, which spin/draft we're on
  const [draftedPlayers, setDraftedPlayers] = useState([]); // [{ player, fromTeamMajor }] — every pick so far
  const [assignments, setAssignments] = useState({}); // { roleId: player | null } — the live board
  const [pendingPlayer, setPendingPlayer] = useState(null); // freshly drafted, not yet placed
  const [resolvedTeamMajor, setResolvedTeamEra] = useState(null);
  const [teamRerollsUsed, setTeamRerollsUsed] = useState(0);
  const [majorRerollsUsed, setMajorRerollsUsed] = useState(0);
  const [usedTeamMajorIds, setUsedTeamEraIds] = useState([]);
  const [rerollConstraint, setRerollConstraint] = useState(null);
  const [iglPlayerId, setIglPlayerId] = useState(null);

  const draftComplete = draftedPlayers.length >= TOTAL_PICKS;

  const handleStart = useCallback(() => setPhase("mode"), []);

  const handleModeChosen = useCallback(({ statsRevealed, gameMode }) => {
    setStatsRevealed(statsRevealed);
    setGameMode(gameMode);
    setPhase("spin");
  }, []);

  const handleSpinResolved = useCallback((teamEra) => {
    setResolvedTeamEra(teamEra);
    setRerollConstraint(null);
    setPhase("draft");
  }, []);

  const handleRerollTeam = useCallback(() => {
    setTeamRerollsUsed((n) => n + 1);
    setRerollConstraint({ type: "team", major: resolvedTeamMajor.major, excludeId: resolvedTeamMajor.id });
    setResolvedTeamEra(null);
    setPhase("spin");
  }, [resolvedTeamMajor]);

  const handleRerollMajor = useCallback(() => {
    setMajorRerollsUsed((n) => n + 1);
    setRerollConstraint({ type: "major", org: resolvedTeamMajor.org, excludeId: resolvedTeamMajor.id });
    setResolvedTeamEra(null);
    setPhase("spin");
  }, [resolvedTeamMajor]);

  const handlePlayerDrafted = useCallback(
    (player) => {
      setDraftedPlayers((prev) => [...prev, { player, fromTeamMajor: resolvedTeamMajor.id }]);
      setUsedTeamEraIds((prev) => [...prev, resolvedTeamMajor.id]);
      setPendingPlayer(player); // must be placed before the next spin
      setResolvedTeamEra(null);
      setPhase("place"); // board-focused phase: place the pending pick, or rearrange existing ones
    },
    [resolvedTeamMajor]
  );

  // Drag-and-drop handler shared by the live board for both placing a new
  // pending pick and rearranging any already-placed player.
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over) return;

      // Drag from draft pool directly onto a roster slot
      if (active.data?.current?.type === "draft-pool") {
        const player = active.data.current.player;
        const activeSlotOrder = gameMode === "hltv3" ? SLOT_ORDER_HLTV3 : SLOT_ORDER;
        if (!activeSlotOrder.includes(over.id)) return;
        setDraftedPlayers((prev) => [...prev, { player, fromTeamMajor: resolvedTeamMajor.id }]);
        setUsedTeamEraIds((prev) => [...prev, resolvedTeamMajor.id]);
        setAssignments((prev) => {
          const next = { ...prev };
          const occupant = prev[over.id] || null;
          next[over.id] = player;
          setPendingPlayer(occupant); // null if slot was empty, bumped player if not
          return next;
        });
        setResolvedTeamEra(null);
        setPhase("place");
        return;
      }

      // IGL badge assignment
      if (active.id === "igl-badge") {
        const slotId = over.id;
        const activeSlotOrder = gameMode === "hltv3" ? SLOT_ORDER_HLTV3 : SLOT_ORDER;
        if (activeSlotOrder.includes(slotId)) {
          const occupant = assignments[slotId];
          setIglPlayerId(occupant ? occupant.id : null);
        }
        return;
      }

      const droppedRoleId = over.id; // slot roleId being dropped onto
      const draggedPlayerId = active.id; // player.id being dragged

      const isPendingDrag = pendingPlayer && pendingPlayer.id === draggedPlayerId;

      setAssignments((prev) => {
        const next = { ...prev };
        const activeSlotOrder = gameMode === "hltv3" ? SLOT_ORDER_HLTV3 : SLOT_ORDER;

        // Find which slot (if any) the dragged player currently occupies.
        let sourceRoleId = null;
        for (const r of activeSlotOrder) {
          if (prev[r] && prev[r].id === draggedPlayerId) sourceRoleId = r;
        }

        const playerToPlace = isPendingDrag ? pendingPlayer : sourceRoleId ? prev[sourceRoleId] : null;
        if (!playerToPlace) return prev;

        const occupant = prev[droppedRoleId] || null;

        if (sourceRoleId) {
          // Rearranging an already-placed player. If the target slot is
          // occupied, this is a clean swap: the occupant takes the dragged
          // player's old slot. No one ever becomes "pending" in this case.
          next[droppedRoleId] = playerToPlace;
          next[sourceRoleId] = occupant; // null if target was empty — correct either way
        } else {
          // Placing the pending (not-yet-slotted) pick. If the target slot
          // is occupied, the occupant gets bumped out and becomes the new
          // pending player, needing a new home before the draft can continue.
          next[droppedRoleId] = playerToPlace;
          if (occupant) {
            setPendingPlayer(occupant);
          } else {
            setPendingPlayer(null);
          }
        }

        return next;
      });
    },
    [pendingPlayer, assignments, gameMode, resolvedTeamMajor]
  );

  const handleContinueAfterPlacement = useCallback(() => {
    if (draftComplete) {
      setPhase("results");
    } else {
      setPickIndex((i) => i + 1);
      setPhase("spin");
    }
  }, [draftComplete]);

  const handleRestart = useCallback(() => {
    setPhase("mode");
    setPickIndex(0);
    setDraftedPlayers([]);
    setAssignments({});
    setPendingPlayer(null);
    setResolvedTeamEra(null);
    setTeamRerollsUsed(0);
    setMajorRerollsUsed(0);
    setUsedTeamEraIds([]);
    setRerollConstraint(null);
    setGameMode("classic");
    setIglPlayerId(null);
  }, []);

  const iglRequired = gameMode === "hltv3" && draftComplete && !iglPlayerId;
  const readyToContinue = !pendingPlayer && !iglRequired;

  return (
    <div className="min-h-screen bg-broadcast-bg broadcast-texture font-body text-broadcast-text">
      <TopBar phase={phase} statsRevealed={statsRevealed} />

      {phase === "intro" && <IntroScreen onStart={handleStart} />}

      {phase === "mode" && <ModeSelectScreen onChoose={handleModeChosen} />}

      {(phase === "spin" || phase === "draft" || phase === "place") && (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 pt-6 lg:flex-row">
            <MathGuide />
            <div className="flex-1">
              {phase === "spin" && (
                <SpinnerScreen
                  pickNumber={pickIndex + 1}
                  totalPicks={TOTAL_PICKS}
                  rerollConstraint={rerollConstraint}
                  onResolved={handleSpinResolved}
                  excludeIds={usedTeamMajorIds.flatMap((id) => relatedRosters[id] ?? [])}
                  gameMode={gameMode}
                />
              )}
              {phase === "draft" && resolvedTeamMajor && (
                <DraftScreen
                  teamMajor={resolvedTeamMajor}
                  pickNumber={pickIndex + 1}
                  totalPicks={TOTAL_PICKS}
                  onPick={handlePlayerDrafted}
                  usedPlayerIds={draftedPlayers.map((d) => d.player.id)}
                  statsRevealed={statsRevealed}
                  teamRerollsUsed={teamRerollsUsed}
                  majorRerollsUsed={majorRerollsUsed}
                  onRerollTeam={handleRerollTeam}
                  onRerollMajor={handleRerollMajor}
                  gameMode={gameMode}
                />
              )}
              {phase === "place" && (
                <PlacementPrompt
                  pendingPlayer={pendingPlayer}
                  draftComplete={draftComplete}
                  readyToContinue={readyToContinue}
                  iglRequired={iglRequired}
                  onContinue={handleContinueAfterPlacement}
                />
              )}
            </div>
            <LiveRosterBoard
              assignments={assignments}
              pendingPlayer={pendingPlayer}
              draftedPlayers={draftedPlayers}
              statsRevealed={statsRevealed}
              pickNumber={pickIndex + 1}
              totalPicks={TOTAL_PICKS}
              gameMode={gameMode}
              iglPlayerId={iglPlayerId}
            />
          </div>
        </DndContext>
      )}

      {phase === "results" && (
        <ResultsScreen assignments={assignments} statsRevealed={statsRevealed} onRestart={handleRestart} gameMode={gameMode} iglPlayerId={iglPlayerId} />
      )}

      <Footer />
    </div>
  );
}

function PlacementPrompt({ pendingPlayer, draftComplete, readyToContinue, iglRequired, onContinue }) {
  return (
    <div className="rounded-sm border border-broadcast-line bg-broadcast-panel p-8 text-center">
      {pendingPlayer ? (
        <>
          <div className="font-mono text-xs uppercase tracking-widest text-broadcast-orange">
            Drag to place
          </div>
          <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
            Drop <span className="text-broadcast-orange">{pendingPlayer.name}</span> into a slot
          </h2>
          <p className="mt-3 text-sm text-broadcast-muted-2">
            Drag their card on the right into any open role slot. You can also drag any
            already-placed player to a different slot, or swap two players around.
          </p>
        </>
      ) : iglRequired ? (
        <>
          <div className="font-mono text-xs uppercase tracking-widest text-broadcast-green">
            One more thing
          </div>
          <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
            Assign your <span className="text-broadcast-green">IGL</span>
          </h2>
          <p className="mt-3 text-sm text-broadcast-muted-2">
            Drag the IGL badge on the right onto a player before seeing your result.
            Your IGL's CS2 major experience adds a bonus to your final strength rating.
          </p>
        </>
      ) : (
        <>
          <div className="font-mono text-xs uppercase tracking-widest text-broadcast-green">
            Placed
          </div>
          <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
            Rearrange freely, or continue
          </h2>
          <p className="mt-3 text-sm text-broadcast-muted-2">
            Drag anyone on the board to a different slot if you've changed your mind.
            {draftComplete ? " All five picks are in — ready to see your result." : " Ready for the next spin?"}
          </p>
        </>
      )}

      <button
        onClick={onContinue}
        disabled={!readyToContinue}
        className={`mt-6 rounded-sm px-8 py-4 font-display text-xl font-bold uppercase tracking-wide text-broadcast-bg transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 ${
          iglRequired ? "bg-broadcast-green" : "bg-broadcast-orange"
        }`}
      >
        {draftComplete ? "See your result" : "Spin for next pick"}
      </button>
    </div>
  );
}

function TopBar({ phase, statsRevealed }) {
  return (
    <header className="border-b border-broadcast-line bg-broadcast-panel/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div onClick={() => location.reload()} style={{ cursor: 'pointer' }} className="flex h-8 w-8 items-center justify-center rounded-sm bg-broadcast-orange font-display text-lg font-black text-broadcast-bg">
            GO
          </div>
          <div className="font-display text-xl font-bold uppercase tracking-wide">
            WIN THE <span className="text-broadcast-orange">MAJOR</span>{" "}
          </div>
        </div>
        {phase !== "intro" && phase !== "mode" && (
          <div className="hidden items-center gap-2 font-mono text-xs uppercase tracking-widest text-broadcast-muted sm:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${statsRevealed ? "bg-broadcast-green" : "bg-broadcast-orange"}`} />
            {statsRevealed ? "Stats revealed" : "CS knowledge mode"}
          </div>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-broadcast-line px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-center font-mono text-[11px] uppercase tracking-widest text-broadcast-muted sm:flex-row sm:justify-between">
        <span>Win The Major — by Christian Watts</span>
        <span>Unofficial fan project. Not affiliated with Valve, HLTV, PGL, or any Counter-Strike organization. Player stats are approximations based on publicly reported data. No user data is collected.</span>
      </div>
    </footer>
  );
}
