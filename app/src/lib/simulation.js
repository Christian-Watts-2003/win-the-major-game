// Core simulation engine for the CS GOAT roster builder.
//
// Strength rating: combines each player's rating/K-D/ADR/impact into a single
// per-player score, then aggregates the 5-man lineup into a team Strength Rating.
// Role synergy bonuses reward filling the lineup with players in roles they're
// actually good at (vs. forcing a player into a role they're not tagged for).
//
// Major outcome: team Strength Rating maps to a "quality" score (0-1) via a
// logistic curve centered on a baseline "average pro roster." That quality
// then drives a single weighted-random roll into one of six tiers, from
// Did Not Qualify up to Major Champion — the higher the quality, the more
// weight piles onto the top tiers, but every tier keeps some probability so
// upsets (and underwhelming results from stacked lineups) can still happen.

import {
  SCORE_WEIGHTS, SCORE_STRETCH,
  ROLE_FIT_BONUS, ROLE_OFFROLE_PENALTY,
  IGL_ABSENT_FACTOR,
  AWP_PRESENT_FACTOR, AWP_ABSENT_FACTOR,
  MATCH_LOGISTIC_K, MATCH_WIN_PROB_MIN, MATCH_WIN_PROB_MAX,
  CS2_MAJORS, HLTV3_IGL_CS2_MAJOR_BONUS, HLTV3_STAR_BOOST,
} from "../config.js";
import { TEAM_MAJORS } from "./draftData.js";

function buildChemistryMap(teamMajors) {
  const map = new Map();
  for (const team of teamMajors) {
    const gamertags = team.players.map((p) => p.id.split("_")[0]);
    for (let i = 0; i < gamertags.length; i++) {
      for (let j = i + 1; j < gamertags.length; j++) {
        const key = [gamertags[i], gamertags[j]].sort().join(":");
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
  }
  return map;
}

const CHEMISTRY_MAP = buildChemistryMap(TEAM_MAJORS);

// Count how many teamMajor entries each gamertag appears in WITH the igl role tag.
function buildIglMajorsMap(teamMajors) {
  const map = new Map();
  for (const team of teamMajors) {
    for (const player of team.players) {
      if (player.roles.includes("igl")) {
        const gamertag = player.id.split("_")[0];
        map.set(gamertag, (map.get(gamertag) ?? 0) + 1);
      }
    }
  }
  return map;
}

export const IGL_MAJORS_MAP = buildIglMajorsMap(TEAM_MAJORS);

// Count CS2-era majors each gamertag appeared in WITH the igl role (for HLTV 3.0 IGL bonus).
function buildCs2IglMajorsMap(teamMajors) {
  const map = new Map();
  for (const team of teamMajors) {
    if (!CS2_MAJORS.includes(team.major)) continue;
    for (const player of team.players) {
      if (!player.roles.includes("igl")) continue;
      const gamertag = player.id.split("_")[0];
      map.set(gamertag, (map.get(gamertag) ?? 0) + 1);
    }
  }
  return map;
}

export const CS2_IGL_MAJORS_MAP = buildCs2IglMajorsMap(TEAM_MAJORS);

function computeChemistry(lineup) {
  const gamertags = lineup.map(({ player }) => player.id.split("_")[0]);
  let raw = 0;
  for (let i = 0; i < gamertags.length; i++) {
    for (let j = i + 1; j < gamertags.length; j++) {
      const key = [gamertags[i], gamertags[j]].sort().join(":");
      raw += CHEMISTRY_MAP.get(key) ?? 0;
    }
  }
  const CHEMISTRY_SCALE = 30;
  const CHEMISTRY_MAX_BONUS = 0.15;
  const factor = 1.0 + Math.min(raw / CHEMISTRY_SCALE, 1) * CHEMISTRY_MAX_BONUS;
  return { raw, factor };
}

export function playerScore(player) {
  // 0 is the sentinel for "not filled in" — exclude missing stats and
  // redistribute their weight proportionally across the available ones.
  const candidates = [
    { key: "rating", value: player.rating, component: (player.rating - 1.0) * 100 },
    { key: "kd",     value: player.kd,     component: (player.kd     - 1.0) * 40  },
    { key: "adr",    value: player.adr,    component: (player.adr    - 70)  * 0.6 },
    { key: "impact", value: player.impact, component: (player.impact - 1.0) * 70  },
  ].filter((s) => s.value !== 0);

  const totalWeight = candidates.reduce((sum, s) => sum + SCORE_WEIGHTS[s.key], 0);
  if (totalWeight === 0) return 100;

  const centered = candidates.reduce(
    (sum, s) => sum + s.component * (SCORE_WEIGHTS[s.key] / totalWeight),
    0
  );

  return 100 + centered * SCORE_STRETCH;
}

// HLTV 3.0 player score — uses CS2-era stats with calibrated baselines.
// Stat averages across the CS2 Major player pool (n=160):
//   rating3 ≈ 1.004  (range 0.62–1.46)
//   kast    ≈ 71.0%  (range 57.4–80.5)
//   kpr     ≈ 0.642  (range 0.42–0.93)
//   dpr     ≈ 0.667  (range 0.52–0.90, lower is better → inverted)
export function playerScoreHltv3(player) {
  const candidates = [
    player.rating3 ? { w: 0.45, c: (player.rating3 - 1.0)  * 100 } : null,
    player.kast    ? { w: 0.25, c: (player.kast    - 71.0)  * 1.0 } : null,
    player.kpr     ? { w: 0.20, c: (player.kpr     - 0.642) * 80  } : null,
    player.dpr     ? { w: 0.10, c: (0.667 - player.dpr)     * 60  } : null,
  ].filter(Boolean);

  const totalW = candidates.reduce((s, c) => s + c.w, 0);
  if (totalW === 0) return 100;

  const centered = candidates.reduce((s, c) => s + c.c * (c.w / totalW), 0);
  return 100 + centered * SCORE_STRETCH;
}

// Role → which 0-100 attributes matter most (primary: 60%, secondary: 40%).
// Star has no fixed spec — handled separately in roleEfficiency.
const ROLE_ATTRS = {
  awp:     { primary: ["sniping", "opening"],    secondary: ["trading"] },
  entry:   { primary: ["entrying", "opening"],   secondary: ["trading"] },
  support: { primary: ["utility", "trading"],    secondary: ["clutching"] },
  lurker:  { primary: ["opening", "clutching"],  secondary: ["trading"] },
  igl:     { primary: ["clutching", "opening"],  secondary: ["utility"] },
};

const ALL_ATTRS = ["clutching", "entrying", "firepower", "opening", "sniping", "trading", "utility"];

// Returns a multiplier based on how well the player's attributes match the role.
// Star: all attributes weighted equally, slightly wider range (0.90–1.14).
// Others: 0.90–1.10. Returns 1.0 when no attribute data is present.
function roleEfficiency(player, roleId) {
  if (roleId === "star") {
    const filled = ALL_ATTRS.filter((a) => (player[a] ?? 0) > 0);
    if (filled.length === 0) return 1.0;
    const avg = filled.reduce((s, a) => s + player[a] / 100, 0) / filled.length;
    // avg 0 → 0.90×, avg 0.5 → 1.02×, avg 1.0 → 1.14×
    return 0.90 + avg * 0.24;
  }

  const spec = ROLE_ATTRS[roleId];
  if (!spec) return 1.0;

  const slots = [
    ...spec.primary.map((a) => ({ attr: a, weight: 0.6 / spec.primary.length })),
    ...spec.secondary.map((a) => ({ attr: a, weight: 0.4 / spec.secondary.length })),
  ];

  const filled = slots.filter(({ attr }) => (player[attr] ?? 0) > 0);
  if (filled.length === 0) return 1.0;

  const totalW = filled.reduce((s, { weight }) => s + weight, 0);
  const score  = filled.reduce((s, { attr, weight }) => s + (player[attr] / 100) * (weight / totalW), 0);

  // score 0 → 0.90×, score 0.5 → 1.00×, score 1.0 → 1.10×
  return 0.90 + score * 0.20;
}

export function effectivePlayerScore(player, assignedRoleId) {
  const base = playerScore(player);
  const isNaturalFit = player.roles.includes(assignedRoleId);
  const roleFit = isNaturalFit ? ROLE_FIT_BONUS : ROLE_OFFROLE_PENALTY;
  return base * roleFit * roleEfficiency(player, assignedRoleId);
}

// lineup: array of 5 { player, roleId } entries
export function computeTeamStrength(lineup) {
  return computeStrengthBreakdown(lineup).finalStrength;
}

// Same aggregation as computeTeamStrength, but returns every intermediate
// ingredient so the UI can show a real breakdown instead of one collapsed
// number. All multipliers here are applied in the same order/grouping as
// the final strength calculation, so finalStrength here always matches
// computeTeamStrength's output exactly.
export function computeStrengthBreakdown(lineup) {
  if (!lineup || lineup.length === 0) {
    return {
      finalStrength: 0,
      teamAvgRating: 0,
      teamAvgKd: 0,
      teamAvgAdr: 0,
      teamAvgImpact: 0,
      avgEffectiveScore: 0,
      chemistryRaw: 0,
      chemistryFactor: 1,
      iglFactor: 1,
      iglMajors: 0,
      awpFactor: 1,
      hasNaturalIGL: false,
      hasNaturalAwp: false,
      offRoleCount: 0,
    };
  }

  const players = lineup.map((slot) => slot.player);
  const teamAvgRating = average(players.map((p) => p.rating));
  const teamAvgKd = average(players.map((p) => p.kd));
  const teamAvgAdr = average(players.map((p) => p.adr));
  const teamAvgImpact = average(players.map((p) => p.impact));

  const scores = lineup.map((slot) => effectivePlayerScore(slot.player, slot.roleId));
  const avgEffectiveScore = average(scores);
  const offRoleCount = lineup.filter((slot) => !slot.player.roles.includes(slot.roleId)).length;

  const { raw: chemistryRaw, factor: chemistryFactor } = computeChemistry(lineup);

  const iglSlot = lineup.find((slot) => slot.roleId === "igl");
  const hasNaturalIGL = iglSlot?.player.roles.includes("igl") ?? false;
  const iglMajors = hasNaturalIGL
    ? (IGL_MAJORS_MAP.get(iglSlot.player.id.split("_")[0]) ?? 0)
    : 0;
  const iglFactor = hasNaturalIGL ? 1.0 + iglMajors * 0.01 : IGL_ABSENT_FACTOR;

  const hasNaturalAwp = lineup.some((slot) => slot.roleId === "awp" && slot.player.roles.includes("awp"));
  const awpFactor = hasNaturalAwp ? AWP_PRESENT_FACTOR : AWP_ABSENT_FACTOR;

  const finalStrength = Math.round(avgEffectiveScore * chemistryFactor * iglFactor * awpFactor * 10) / 10;

  return {
    finalStrength,
    teamAvgRating,
    teamAvgKd,
    teamAvgAdr,
    teamAvgImpact,
    avgEffectiveScore,
    chemistryFactor,
    chemistryRaw,
    iglFactor,
    iglMajors,
    awpFactor,
    hasNaturalIGL,
    hasNaturalAwp,
    offRoleCount,
  };
}

// HLTV 3.0 strength: attribute-based scoring only — no role-tag fit check.
// "star" maps to the same efficiency spec as "support".
// IGL bonus comes from the iglPlayerId badge, not a dedicated slot.
// AWP factor always applied (player is explicitly assigned the AWP slot).
export function computeStrengthBreakdownHltv3(lineup, iglPlayerId = null) {
  if (!lineup || lineup.length === 0) {
    return {
      finalStrength: 0, teamAvgRating: 0, teamAvgKd: 0, teamAvgAdr: 0,
      teamAvgImpact: 0, avgEffectiveScore: 0, chemistryRaw: 0,
      chemistryFactor: 1, iglFactor: 1, iglCs2Majors: 0, awpFactor: 1, starBoost: 1.05,
    };
  }

  const players = lineup.map((slot) => slot.player);
  const teamAvgRating    = average(players.map((p) => p.rating3 ?? p.rating));
  const teamAvgKd        = average(players.map((p) => p.kpr ?? p.kd));
  const teamAvgAdr       = average(players.map((p) => p.dpr ?? p.adr));
  const teamAvgImpact    = average(players.map((p) => p.kast ?? p.impact));
  const teamAvgKast      = average(players.map((p) => p.kast ?? 0));
  const teamAvgMultiKill = average(players.map((p) => p.multiKill ?? 0));
  const teamAvgRsw       = average(players.map((p) => p.roundSwingPct ?? 0));
  
  const scores = lineup.map((slot) => {
    const starBoost = slot.roleId === "star" ? HLTV3_STAR_BOOST : 1.0;
    return playerScoreHltv3(slot.player) * roleEfficiency(slot.player, slot.roleId) * starBoost;
  });
  const avgEffectiveScore = average(scores);

  const { raw: chemistryRaw, factor: chemistryFactor } = computeChemistry(lineup);

  const iglCs2Majors = iglPlayerId
    ? (CS2_IGL_MAJORS_MAP.get(iglPlayerId.split("_")[0]) ?? 0)
    : 0;
  const iglFactor = 1.0 + iglCs2Majors * HLTV3_IGL_CS2_MAJOR_BONUS;

  const awpFactor = AWP_PRESENT_FACTOR; // AWP slot is always explicitly assigned

  const finalStrength = Math.round(avgEffectiveScore * chemistryFactor * iglFactor * awpFactor * 10) / 10;

  return {
    finalStrength, teamAvgRating, teamAvgKd, teamAvgAdr, teamAvgImpact,
    teamAvgKast, teamAvgMultiKill, teamAvgRsw,
    iglFactor, iglCs2Majors, awpFactor, starBoost: HLTV3_STAR_BOOST,
  };
}

function average(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// --- Opponent generation -----------------------------------------------
//
// A team-era's full roster can have more than 5 players (documented
// substitutes/era-spanning swaps). To turn one into a fair "opponent" for
// the tournament, we need its best possible 5-man lineup — the assignment
// of 5 of its players to the 5 roles that maximizes total effective score,
// scored with the exact same function the person's own lineup uses.
//
// Roster sizes here are small (5-10 players, 5 roles), so brute-force
// permutation search is instant and guarantees the true optimum rather than
// a greedy approximation.

const SLOT_ORDER = ["awp", "entry", "support", "lurker", "igl"];

function* permutations(arr, k) {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest, k - 1)) {
      yield [arr[i], ...perm];
    }
  }
}

// Returns { lineup, strength } where lineup is [{ roleId, player }, ...]
// for the best-scoring 5-player/5-role assignment found in this roster.
export function bestLineupForRoster(players) {
  let bestLineup = null;
  let bestStrength = -Infinity;

  // Cap search space defensively — even our largest roster (10 players)
  // produces 10*9*8*7*6 = 30,240 permutations, which is fine, but this
  // guards against a future dataset edit blowing up combinatorially.
  const pool = players.slice(0, 12);

  for (const chosenFive of permutations(pool, 5)) {
    const lineup = SLOT_ORDER.map((roleId, i) => ({ roleId, player: chosenFive[i] }));
    const strength = computeTeamStrength(lineup);
    if (strength > bestStrength) {
      bestStrength = strength;
      bestLineup = lineup;
    }
  }

  return { lineup: bestLineup, strength: bestStrength };
}

// Pre-compute every team-era's best lineup + strength once. Used to rank
// historical team-eras by difficulty for the tournament opponent ramp.
let cachedOpponentPool = null;
export function getOpponentPool(teamMajors) {
  if (cachedOpponentPool) return cachedOpponentPool;
  cachedOpponentPool = teamMajors
    .filter((t) => t.players.some((p) => p.rating !== 0 || p.kd !== 0))
    .map((teamMajor) => {
      const { lineup, strength } = bestLineupForRoster(teamMajor.players);
      return { teamMajor, lineup, strength };
    })
    .sort((a, b) => a.strength - b.strength);
  return cachedOpponentPool;
}

// HLTV3 opponent scoring: same 3.0 stat formula + role efficiency as the
// player's team. No IGL badge for opponents (neutral iglFactor = 1.0).
const SLOT_ORDER_HLTV3 = ["awp", "entry", "support", "star", "lurker"];

function teamStrengthHltv3(lineup) {
  const scores = lineup.map((slot) => {
    const starBoost = slot.roleId === "star" ? HLTV3_STAR_BOOST : 1.0;
    return playerScoreHltv3(slot.player) * roleEfficiency(slot.player, slot.roleId) * starBoost;
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const { factor: chemFactor } = computeChemistry(lineup);
  return Math.round(avg * chemFactor * AWP_PRESENT_FACTOR * 10) / 10;
}

function bestLineupForRosterHltv3(players) {
  let bestLineup = null;
  let bestStrength = -Infinity;
  const pool = players.slice(0, 12);
  for (const chosenFive of permutations(pool, 5)) {
    const lineup = SLOT_ORDER_HLTV3.map((roleId, i) => ({ roleId, player: chosenFive[i] }));
    const strength = teamStrengthHltv3(lineup);
    if (strength > bestStrength) { bestStrength = strength; bestLineup = lineup; }
  }
  return { lineup: bestLineup, strength: bestStrength };
}

let cachedOpponentPoolHltv3 = null;
export function getOpponentPoolHltv3(teamMajors) {
  if (cachedOpponentPoolHltv3) return cachedOpponentPoolHltv3;
  cachedOpponentPoolHltv3 = teamMajors
    .filter((t) => CS2_MAJORS.includes(t.major) && t.players.some((p) => p.kast && p.kast !== 0))
    .map((teamMajor) => {
      const { lineup, strength } = bestLineupForRosterHltv3(teamMajor.players);
      return { teamMajor, lineup, strength };
    })
    .sort((a, b) => a.strength - b.strength);
  return cachedOpponentPoolHltv3;
}

// Logistic match-win probability between two strength ratings. Centered so
// equal strength = 50/50. Calibrated independently from the per-player
// scoring above: tournament opponents are real historical team-eras played at their best
// possible lineup, which cluster in a narrower, higher range (roughly
// 115-140) than the full spread of strengths a drafted lineup can have
// (off-role-heavy lineups can sit well under 100). A steeper curve here
// would make merely-decent lineups nearly unwinnable from round 1 onward;
// this gentler slope keeps every match a real contest while still rewarding
// genuinely elite lineups with a clear, compounding edge.
export function matchWinProbability(strengthA, strengthB) {
  const diff = strengthA - strengthB;
  const p = 1 / (1 + Math.exp(-MATCH_LOGISTIC_K * diff));
  return clamp(p, MATCH_WIN_PROB_MIN, MATCH_WIN_PROB_MAX);
}
