# System Design — Win The Major

## Overview

Win The Major is a fully client-side React application with no backend.
The entire dataset, all game logic, and the tournament simulation live in
the browser. Deployment is a static build served from Render.

```
Browser
  └── React SPA (Vite build → app/dist/)
        ├── Game state (App.jsx — useState/useCallback)
        ├── UI screens (src/components/)
        ├── Game logic (src/lib/)
        └── Dataset (src/data/teams.json)
```

---

## Data Flow

```
teams.json
  └── draftData.js  (imports, re-exports, spin helpers)
        ├── SpinnerScreen   → resolves a team-era
        ├── DraftScreen     → lists eligible players
        ├── LiveRosterBoard → shows origin labels
        └── simulation.js   → builds opponent pool, CHEMISTRY_MAP, IGL maps
              └── tournament.js → runs Swiss + bracket simulation
```

---

## Game State Machine

Managed entirely in `App.jsx` via `useState`. All transitions are
synchronous handler callbacks.

```
intro → mode → spin → draft → place → spin (next pick)
                                  └──────────── (× 5 picks) → results
```

| Phase | Screen | Condition to leave |
|-------|--------|--------------------|
| `intro` | IntroScreen | User clicks "Start the draft" |
| `mode` | ModeSelectScreen | User selects a mode and clicks Continue |
| `spin` | SpinnerScreen | Spinner animation completes (auto-navigates) |
| `draft` | DraftScreen | User clicks a player card to draft them |
| `place` | PlacementPrompt + LiveRosterBoard | pendingPlayer is null AND (classic: always; hltv3: iglPlayerId is set) |
| `results` | ResultsScreen + TournamentBracket | User clicks "Build another lineup" (→ mode) |

Reroll actions (`handleRerollTeam`, `handleRerollMajor`) return to `spin` with
a `rerollConstraint` that auto-fires the constrained spin on mount.

---

## Scoring System

### Classic mode

**Per-player score** (`playerScore`, `simulation.js`):

```
base = 100 + Σ [ statComponent(stat) × weight(stat) / Σweight ] × SCORE_STRETCH

statComponent(rating) = (rating - 1.0) × 100
statComponent(kd)     = (kd     - 1.0) × 40
statComponent(adr)    = (adr    - 70)  × 0.6
statComponent(impact) = (impact - 1.0) × 70

weights: rating=0.45, kd=0.20, adr=0.15, impact=0.20
SCORE_STRETCH = 3.1
```

Stats with value 0 are excluded and weights are redistributed proportionally,
so partial stat records don't penalise the player.

**Effective score** (`effectivePlayerScore`):

```
effective = playerScore(player)
          × roleFitMultiplier        (1.00 if natural role, 0.80 if off-role)
          × roleEfficiency(player, roleId)
```

`roleEfficiency` maps the player's 0–100 attribute scores onto the role's
primary (60%) and secondary (40%) key attributes, producing a multiplier
in the range [0.90, 1.10]. The star slot treats all seven attributes equally
and ranges [0.90, 1.14].

**Team strength** (`computeStrengthBreakdown`):

```
finalStrength = avg(effectiveScores)
              × chemistryFactor
              × iglFactor
              × awpFactor

chemistryFactor = 1.0 + min(sharedMajorAppearances / 30, 1) × 0.15
iglFactor       = 1.0 + iglMajors × 0.01   (if natural IGL in IGL slot)
                = IGL_ABSENT_FACTOR (0.90)   (if no natural IGL)
awpFactor       = AWP_PRESENT_FACTOR (1.03)  (if natural AWPer in AWP slot)
                = AWP_ABSENT_FACTOR  (0.90)  (otherwise)
```

### HLTV 3.0 mode

**Per-player score** (`playerScoreHltv3`):

```
base = 100 + Σ [ statComponent(stat) × weight(stat) / Σweight ] × SCORE_STRETCH

statComponent(rating3) = (rating3 - 1.000) × 100    weight 0.45
statComponent(kast)    = (kast    - 71.0)  × 1.0    weight 0.25
statComponent(kpr)     = (kpr     - 0.642) × 80     weight 0.20
statComponent(dpr)     = (0.667   - dpr)   × 60     weight 0.10   (inverted: lower dpr is better)
```

Baselines are mean values across the CS2 Major player pool (n ≈ 160).

**Effective score**:

```
effective = playerScoreHltv3(player)
          × roleEfficiency(player, roleId)
          × starBoost  (HLTV3_STAR_BOOST = 1.05 if slot is "star", else 1.0)
```

No role-tag penalty in HLTV 3.0 — `roleEfficiency` alone governs fit.

**Team strength** (`computeStrengthBreakdownHltv3`):

```
finalStrength = avg(effectiveScores)
              × chemistryFactor
              × iglFactor
              × AWP_PRESENT_FACTOR (always 1.03 — AWP slot always explicitly filled)

iglFactor = 1.0 + iglCs2Majors × HLTV3_IGL_CS2_MAJOR_BONUS (0.02)
```

`iglCs2Majors` counts CS2-era majors where the designated IGL player held the
`igl` role tag, drawn from `CS2_IGL_MAJORS_MAP`.

---

## Chemistry System

A shared roster appearance map (`CHEMISTRY_MAP`) is built once at module load
from `TEAM_MAJORS`. For any pair of players (A, B), the map holds the number
of team-era entries they both appeared on. Chemistry factor:

```
chemistryFactor = 1.0 + min(rawScore / 30, 1.0) × 0.15
```

Maximum bonus: ×1.15, reached at 30+ shared appearances. Players who have
never shared a roster contribute 0.

---

## Tournament Simulation

### Opponent pool

`getOpponentPool` / `getOpponentPoolHltv3` (`simulation.js`):

For each team-era in the dataset, brute-force all permutations of its players
into the 5 role slots, pick the assignment that maximises `computeTeamStrength`
(or the HLTV3 equivalent), and store `{ teamMajor, lineup, strength }`.
The pool is sorted ascending by strength and cached in a module-level variable
(computed once per session).

HLTV 3.0 mode filters to CS2-era teams that have `kast` filled for every player.
Classic mode filters to teams that have at least one non-zero `rating` or `kd`.

### Opponent selection (`pickFromBand`, `tournament.js`)

Each stage maps to a percentile band of the sorted pool:

```
stage1 : [0.05, 0.48]
stage2 : [0.38, 0.72]
stage3 : [0.65, 0.93]
```

Within the stage band, your current W-L record shifts a sub-band:

```
record  sub-band (of stage band width)
 -2     [0.00, 0.35]   easiest within stage
 -1     [0.15, 0.55]
  0     [0.30, 0.85]
 +1     [0.50, 0.95]
 +2     [0.65, 1.00]   hardest within stage
```

Opponents already used (`usedIds`) are excluded. If no candidates remain,
the full band is used as fallback.

Playoff bands: QF [0.80, 0.90] · SF [0.90, 0.97] · Final [0.97, 1.00]

### Match simulation (`simulateMatch`, `tournament.js`)

```
p = matchWinProbability(yourStrength, opponentStrength)
  = clamp( 1 / (1 + exp(-k × (yourStrength - opponentStrength))),
           MATCH_WIN_PROB_MIN, MATCH_WIN_PROB_MAX )
  where k = MATCH_LOGISTIC_K (0.05)
        MIN = 0.03,  MAX = 0.97
```

Best-of-3: maps played one at a time, each `Math.random() < p`. First to 2 map
wins takes the match.

### Live reveal (`createTournamentRunner`, `tournament.js`)

Returns a stateful iterator. `TournamentBracket.jsx` calls `.next()` once
every 900 ms via a `useEffect` + `setTimeout` chain, rolling dice at reveal
time rather than pre-computing results upfront.

```
runner.next() → { round, done, champion?, eliminatedStage? }
```

The component accumulates rounds in state; `StageColumn` renders all rounds
received so far plus an animated "Playing…" pulse for the current stage.

---

## Component Tree

```
App
├── TopBar
├── IntroScreen
├── ModeSelectScreen
├── DndContext (phases: spin, draft, place)
│   ├── MathGuide               ← left sidebar: role guide + IGL/star tips
│   ├── SpinnerScreen           ← slot machine animation
│   ├── DraftScreen             ← player cards (click or drag to pick)
│   │   └── PlayerCard / Hltv3PlayerCard
│   ├── PlacementPrompt         ← drag instructions / IGL assignment prompt
│   └── LiveRosterBoard         ← right sidebar: role slots + pending card
│       ├── RoleSlot (×5)
│       │   └── DraggableCard
│       ├── IglBadgeArea        ← HLTV3 only
│       └── PendingCard
├── ResultsScreen
│   ├── StrengthBreakdown       ← final lineup + factor breakdown
│   └── TournamentBracket       ← live-reveal Swiss + bracket
│       ├── StageColumn (×4)
│       │   └── RoundCard (×0–5)
│       └── "Build another lineup" button
└── Footer
```

---

## Drag-and-Drop

`@dnd-kit/core` with a single `DndContext` wrapping the full draft flow.
`handleDragEnd` in `App.jsx` distinguishes three drag source types:

| `active.data.current.type` | Source | Effect |
|----------------------------|--------|--------|
| `"draft-pool"` | Player card in DraftScreen | Drafts the player directly onto a slot (skips the "click to draft" step) |
| `"igl-badge"` | IGL badge in LiveRosterBoard | Sets `iglPlayerId` to whichever player occupies the drop target |
| _(player id)_ | DraggableCard in a slot | Swaps or moves an already-placed player; occupant of target slot bumps to pending if target was occupied |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/src/config.js` | All tunable game constants |
| `app/src/App.jsx` | Root component; owns all game state |
| `app/src/lib/draftData.js` | Dataset imports + spin helpers |
| `app/src/lib/simulation.js` | Scoring engine + opponent pool builder |
| `app/src/lib/tournament.js` | Swiss + bracket runner |
| `app/src/lib/attributeIcons.jsx` | SVG icons + attribute/role metadata |
| `app/src/data/teams.json` | Full player + team dataset |
| `app/src/data/headshots.json` | Player ID → image path map |
| `app/src/data/related-rosters.json` | Team-era → sibling roster IDs (used to exclude near-duplicate rosters from sequential spins) |
| `app/scripts/stats-editor-server.js` | Local HTTP tool for importing HLTV stats into teams.json |
| `app/scripts/validate-dataset.js` | CLI validator for teams.json integrity |
| `render.yaml` | Render static site deployment config |
