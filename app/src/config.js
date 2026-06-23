// ─────────────────────────────────────────────────────────────────────────────
// CSGoat 2.0 — Game Configuration
//
// All tunable values live here. Change a number, save, and the dev server
// hot-reloads instantly. No other files need editing for routine tweaks.
// ─────────────────────────────────────────────────────────────────────────────


// ── Draft rules ──────────────────────────────────────────────────────────────

// How many picks the player makes to build their team.
export const TOTAL_PICKS = 5;

// Role slots, in the order they appear on the board (top → bottom).
// These must match the `id` fields in the `roles` array of teams.json.
export const SLOT_ORDER = ["awp", "entry", "support", "lurker", "igl"];

// HLTV 3.0 mode uses attribute-based scoring — no role tags.
// "star" is the star rifler slot; it maps to "support" for efficiency scoring.
export const SLOT_ORDER_HLTV3 = ["awp", "entry", "support", "star", "lurker"];

// IGL bonus in HLTV 3.0: +X per CS2 major the assigned player has attended.
export const HLTV3_IGL_CS2_MAJOR_BONUS = 0.02;

// Star slot boost in HLTV 3.0.
export const HLTV3_STAR_BOOST = 1.05;


// ── Rerolls ───────────────────────────────────────────────────────────────────
//
// After a spin lands, the player can reroll the team (keep major, new org)
// or reroll the major (keep org, new major). Each type has its own budget.
// Set either to 0 to disable that reroll type entirely.

export const MAX_REROLLS_TEAM  = 1;   // "Reroll team"  button uses this pool
export const MAX_REROLLS_MAJOR = 1;   // "Reroll major" button uses this pool


// ── Spinner animation ─────────────────────────────────────────────────────────

// How long the major reel runs before landing (milliseconds).
export const SPIN_DURATION_MS = 1800;

// How many decoy entries scroll past before the real result appears.
export const SPIN_DECOY_COUNT = 14;

// Delay before the team reel starts (and therefore also how much longer it
// runs after the major reel settles).
export const SPIN_TEAM_OFFSET_MS = 600;

// How long to hold both reels on screen after they've both settled, before
// navigating to the draft screen. Gives the player time to read the result.
export const SPIN_RESULT_DWELL_MS = 1000;


// ── HLTV 3.0 mode ────────────────────────────────────────────────────────────
//
// Majors considered "CS2 era" for the HLTV 3.0 draft pool.
// Add future majors here as they're played.

export const CS2_MAJORS = [
  "PGL CS2 Major Copenhagen 2024",
  "Perfect World Shanghai Major 2024",
  "BLAST.tv Austin Major 2025",
  "StarLadder Budapest Major 2025",
  "IEM Cologne 2026",
];


// ── Strength scoring ─────────────────────────────────────────────────────────
//
// playerScore() converts a player's four stats into one number centred on 100.
// Each stat is first re-centred on its "average pro" baseline, then weighted,
// then stretched so elite players separate clearly from average pros.
//
// Baseline values (score contribution = 0 at these values):
//   HLTV Rating 2.0  →  1.0   (average pro)
//   K/D ratio        →  1.0
//   ADR              →  70    (average damage per round)
//   Impact           →  1.0
//
// Weight sum should equal 1.0 for the formula to stay meaningful.

export const SCORE_WEIGHTS = {
  rating: 0.45,   // HLTV Rating 2.0  — strongest single predictor of performance
  kd:     0.20,   // Kill/Death ratio
  adr:    0.15,   // Average Damage per Round
  impact: 0.20,   // Impact rating (clutches, opening kills, multi-kills)
};

// Multiplier applied after weighting. Spreads the distribution so the gap
// between a tier-2 pro (score ≈ 100) and a GOAT-tier player (score ≈ 140+)
// is large enough to matter in the final team strength.
// Lower → scores cluster tightly. Higher → elite players dominate more.
export const SCORE_STRETCH = 3.1;


// ── Role fit multipliers ──────────────────────────────────────────────────────
//
// Applied per-player after the base score is calculated.
// A player in a role they're tagged for gets a bonus.
// A player forced into an untagged role gets a penalty.

export const ROLE_FIT_BONUS    = 1.00;   // × score when player is in their natural role
export const ROLE_OFFROLE_PENALTY = 0.8; // × score when player is forced off-role


// ── Team-level multipliers ────────────────────────────────────────────────────
//
// Applied to the averaged effective score to produce the final team strength.

// IGL coverage: having a natural shotcaller in the IGL slot.
export const IGL_ABSENT_FACTOR  = 0.9;  // serious penalty — uncalled teams collapse

// AWP coverage: having a natural AWPer in the AWP slot.
export const AWP_PRESENT_FACTOR = 1.03;
export const AWP_ABSENT_FACTOR  = 0.9;


// ── Tournament ────────────────────────────────────────────────────────────────

// Steepness of the logistic win-probability curve.
// Higher k → stronger teams win more consistently (fewer upsets).
// Lower k  → results are more random.
// At k=0.05, a +10 strength advantage → ~62% win probability per map.
export const MATCH_LOGISTIC_K = 0.05;

// Win probability is clamped to this range regardless of strength gap.
// Keeps upsets possible and prevents guaranteed sweeps.
export const MATCH_WIN_PROB_MIN = 0.03;
export const MATCH_WIN_PROB_MAX = 0.97;

// Tournament stage opponent strength bands [startPct, endPct] of sorted pool.
// Each stage uses full Swiss: first to 3 wins advances, 3 losses eliminated.
// Within each stage, record-aware sub-banding tightens matchups by W-L record.
// Bands are deliberately steep so 3-1 and 3-2 results are common.
export const STAGE_BANDS = {
  stage1: [0.05, 0.48],
  stage2: [0.38, 0.72],
  stage3: [0.65, 0.93],
};

// Playoff bracket opponent strength bands.
export const PLAYOFF_BANDS = {
  quarterfinal: [0.80, 0.90],
  semifinal:    [0.90, 0.97],
  final:        [0.97, 1.00],
};
