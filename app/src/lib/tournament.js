// Tournament simulation: three group stages (full Swiss, first to 3W or 3L)
// followed by a Quarterfinal → Semifinal → Grand Final bracket.
//
// Each stage draws opponents from a progressively stronger band of the pool,
// with record-aware sub-banding so high-W teams face tougher opponents.
// HLTV3 mode uses a CS2-only opponent pool scored with HLTV 3.0 stats so
// your strength and opponents are on the same scale.

import { getOpponentPool, getOpponentPoolHltv3, matchWinProbability } from "./simulation.js";
import { STAGE_BANDS, PLAYOFF_BANDS } from "../config.js";

const STAGES = [
  { id: "stage1", label: "Opening Stage",    band: STAGE_BANDS.stage1 },
  { id: "stage2", label: "Challengers Stage", band: STAGE_BANDS.stage2 },
  { id: "stage3", label: "Legends Stage",    band: STAGE_BANDS.stage3 },
];

const PLAYOFFS = [
  { id: "quarterfinal", label: "Quarterfinal", band: PLAYOFF_BANDS.quarterfinal },
  { id: "semifinal",    label: "Semifinal",    band: PLAYOFF_BANDS.semifinal    },
  { id: "final",        label: "Grand Final",  band: PLAYOFF_BANDS.final        },
];

function simulateMatch(yourStrength, opponentStrength) {
  const p = matchWinProbability(yourStrength, opponentStrength);
  // Play each map probabilistically (best-of-3)
  let yourMaps = 0, theirMaps = 0;
  const maps = [];
  while (yourMaps < 2 && theirMaps < 2) {
    const mapWon = Math.random() < p;
    maps.push(mapWon);
    if (mapWon) yourMaps++; else theirMaps++;
  }
  const won = yourMaps === 2;
  return { maps, won, score: `${yourMaps}-${theirMaps}`, winProbability: p };
}

// Within a stage band, shift the sampling window based on net W-L record.
// Keeps Swiss matchups appropriately matched — 2-0 teams see top of the stage,
// 0-2 teams see the bottom. [lo, hi] are fractions of the stage band width.
const SUB_BAND = {
  "-2": [0.00, 0.35],
  "-1": [0.15, 0.55],
   "0": [0.30, 0.85],
   "1": [0.50, 0.95],
   "2": [0.65, 1.00],
};

function pickFromBand(pool, band, usedIds, wins = 0, losses = 0) {
  const [s, e] = band;
  const w = e - s;
  const net = Math.max(-2, Math.min(2, wins - losses));
  const [lo, hi] = SUB_BAND[String(net)];
  const subStart = s + w * lo;
  const subEnd   = s + w * hi;
  const start = Math.floor(pool.length * subStart);
  const end   = Math.max(start + 1, Math.floor(pool.length * subEnd));
  const candidates = pool.slice(start, end).filter((t) => !usedIds.has(t.teamMajor.id));
  const bucket = candidates.length > 0 ? candidates : pool.filter((t) => !usedIds.has(t.teamMajor.id));
  return bucket[Math.floor(Math.random() * bucket.length)];
}

// createTournamentRunner returns an object whose .next() simulates exactly one
// match and returns the round data. Call it once per reveal tick so dice are
// rolled at reveal time rather than pre-computed upfront.
export function createTournamentRunner(yourStrength, teamMajors, gameMode = "classic") {
  const pool = gameMode === "hltv3"
    ? getOpponentPoolHltv3(teamMajors)
    : getOpponentPool(teamMajors);

  const usedIds = new Set();
  const stageQueue = [...STAGES];
  const playoffQueue = [...PLAYOFFS];

  let currentStage = stageQueue.shift();
  let wins = 0, losses = 0;
  let inPlayoffs = false;
  let finished = false;

  return {
    done: () => finished,
    next() {
      if (finished) return null;

      if (!inPlayoffs) {
        const opponent = pickFromBand(pool, currentStage.band, usedIds, wins, losses);
        usedIds.add(opponent.teamMajor.id);
        const match = simulateMatch(yourStrength, opponent.strength);
        const roundNum = wins + losses + 1;
        const round = {
          stage: currentStage.id,
          stageLabel: currentStage.label,
          round: {
            id: `${currentStage.id}_r${roundNum}`,
            label: `${wins}-${losses} → R${roundNum}`,
            stage: "group",
          },
          opponent, match, played: true,
          recordBefore: `${wins}-${losses}`,
        };
        if (match.won) wins++; else losses++;

        if (losses >= 3) {
          finished = true;
          return { round, done: true, champion: false, eliminatedStage: currentStage.label };
        }
        if (wins >= 3) {
          const next = stageQueue.shift();
          if (next) { currentStage = next; wins = 0; losses = 0; }
          else inPlayoffs = true;
        }
        return { round, done: false };
      }

      const pRound = playoffQueue.shift();
      const opponent = pickFromBand(pool, pRound.band, usedIds, 1, 0);
      usedIds.add(opponent.teamMajor.id);
      const match = simulateMatch(yourStrength, opponent.strength);
      const round = {
        stage: "playoff", stageLabel: "Playoffs",
        round: { id: pRound.id, label: pRound.label, stage: "playoff" },
        opponent, match, played: true,
      };
      if (!match.won) {
        finished = true;
        return { round, done: true, champion: false, eliminatedStage: pRound.label };
      }
      if (playoffQueue.length === 0) {
        finished = true;
        return { round, done: true, champion: true, eliminatedStage: null };
      }
      return { round, done: false };
    },
  };
}

