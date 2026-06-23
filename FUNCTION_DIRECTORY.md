# Function Directory — Win The Major

All functions, components, and hooks in the source tree, with their purpose,
mathematical description (where applicable), and exact location.

---

## `app/src/config.js`

Exports only — no functions. All tunable game constants. See SYSTEM_DESIGN.md
for descriptions of each exported value.

---

## `app/src/lib/draftData.js`

Data access layer. Imports `teams.json` and exposes typed helpers.

| Export | Line | Purpose |
|--------|------|---------|
| `ROLES` | 4 | Array of role objects from teams.json |
| `TEAM_MAJORS` | 5 | Array of every team-era entry from teams.json |
| `MAJORS` | 6 | Distinct list of major names from `_meta.majors` |
| `getRoleById(roleId)` | 8 | Returns the role object matching `roleId`, or undefined |
| `getAllOrgs()` | 12 | Returns deduped list of all org names across the dataset |
| `findTeamMajor(org, major)` | 16 | Finds the single team-era entry for an org+major pair |
| `spinValidTeamMajor(rng, excludeIds)` | 51 | Picks a random team-era that has at least one stat-filled player, excluding already-used IDs |
| `spinValidCS2TeamMajor(rng, excludeIds)` | 59 | Same as above but restricted to CS2-era majors with full HLTV 3.0 stats |
| `spinTeamKeepMajor(major, excludeIds, rng, requireRating3)` | 66 | Reroll team: keeps the same major, picks a different org |
| `spinMajorKeepTeam(org, excludeIds, rng, requireRating3)` | 75 | Reroll major: keeps the same org, picks a different major they attended |

**Internal helpers:**

| Function | Line | Purpose |
|----------|------|---------|
| `hasStats(t)` | 40 | Returns true if at least one player has a non-zero rating or kd |
| `hasRating3(t)` | 46 | Returns true if every player has a non-zero kast (HLTV 3.0 completeness check) |

---

## `app/src/lib/simulation.js`

Scoring engine and opponent pool builder.

### Module-level initialisation

| Symbol | Line | Purpose |
|--------|------|---------|
| `CHEMISTRY_MAP` | 39 | `Map<"tagA:tagB", count>` of shared major appearances, built once at load |
| `IGL_MAJORS_MAP` | 55 | `Map<gamertag, count>` of all-era majors where player had the `igl` role |
| `CS2_IGL_MAJORS_MAP` | 71 | `Map<gamertag, count>` of CS2-era majors where player had the `igl` role |

### Internal builders

| Function | Line | Purpose |
|----------|------|---------|
| `buildChemistryMap(teamMajors)` | 25 | Iterates all team-era rosters, increments counter for every pair of gamertags that appear together |
| `buildIglMajorsMap(teamMajors)` | 42 | Iterates all rosters, counts appearances with the `igl` role tag |
| `buildCs2IglMajorsMap(teamMajors)` | 58 | Same but filters to CS2 majors only |
| `computeChemistry(lineup)` | 73 | Sums CHEMISTRY_MAP values for all 10 player pairs in a 5-man lineup, returns `{raw, factor}` |
| `roleEfficiency(player, roleId)` | 145 | Maps player's attribute scores to role's key attributes, returns a [0.90–1.14] multiplier |
| `average(values)` | 294 | `Σ values / n` |
| `clamp(value, min, max)` | 298 | Clamps value to [min, max] |
| `permutations(arr, k)` | 316 | Generator yielding all k-permutations of arr (used for brute-force lineup optimisation) |
| `teamStrengthHltv3(lineup)` | 371 | Computes strength for an opponent lineup using HLTV 3.0 scoring |
| `bestLineupForRosterHltv3(players)` | 381 | Brute-forces optimal 5-slot assignment using HLTV 3.0 scoring |

**Math — `roleEfficiency(player, roleId)`:**

For non-star roles, each slot has primary attributes (weight 0.6 total) and
secondary attributes (weight 0.4 total):

```
score = Σ [ (player[attr] / 100) × (slotWeight / totalFilledWeight) ]
      over all attributes that have a non-zero value

multiplier = 0.90 + score × 0.20        → range [0.90, 1.10]
```

For the `star` slot, all seven attributes share equal weight:

```
avg = mean(player[attr] / 100) over all non-zero attributes
multiplier = 0.90 + avg × 0.24          → range [0.90, 1.14]
```

Returns 1.0 when the player has no attribute data.

### Exported functions

| Function | Line | Purpose |
|----------|------|---------|
| `playerScore(player)` | 88 | Converts classic stats (rating, kd, adr, impact) into a score centred on 100 |
| `playerScoreHltv3(player)` | 115 | Converts HLTV 3.0 stats (rating3, kast, kpr, dpr) into a score centred on 100 |
| `effectivePlayerScore(player, roleId)` | 172 | `playerScore × roleFitMultiplier × roleEfficiency` |
| `computeTeamStrength(lineup)` | 180 | Thin wrapper; returns `computeStrengthBreakdown(lineup).finalStrength` |
| `computeStrengthBreakdown(lineup)` | 189 | Full breakdown: all per-player scores, chemistry, IGL, AWP factors, and finalStrength |
| `computeStrengthBreakdownHltv3(lineup, iglPlayerId)` | 255 | Same as above but using HLTV 3.0 scoring and CS2 IGL bonus |
| `bestLineupForRoster(players)` | 331 | Brute-forces all permutations, returns the assignment that maximises classic team strength |
| `getOpponentPool(teamMajors)` | 355 | Builds (and caches) sorted array of `{teamMajor, lineup, strength}` for all stat-filled teams |
| `getOpponentPoolHltv3(teamMajors)` | 394 | Same but filters to CS2 teams with full HLTV 3.0 data and uses HLTV 3.0 scoring |
| `matchWinProbability(strengthA, strengthB)` | 415 | Logistic win probability, clamped to [MIN, MAX] |

**Math — `playerScore(player)`:**

```
base = 100 + (weighted sum of re-centred stat components) × SCORE_STRETCH

components:
  rating component = (rating - 1.0) × 100
  kd     component = (kd     - 1.0) × 40
  adr    component = (adr    - 70)  × 0.6
  impact component = (impact - 1.0) × 70

weights: rating=0.45, kd=0.20, adr=0.15, impact=0.20
```

Stats with value 0 are excluded; remaining weights are renormalised to sum to 1.

**Math — `playerScoreHltv3(player)`:**

```
base = 100 + (weighted sum) × SCORE_STRETCH

components (using CS2 Major pool averages as baselines):
  rating3 component = (rating3 - 1.000) × 100   weight 0.45
  kast    component = (kast    - 71.0)  × 1.0    weight 0.25
  kpr     component = (kpr     - 0.642) × 80     weight 0.20
  dpr     component = (0.667   - dpr)   × 60     weight 0.10  (inverted)
```

**Math — `computeStrengthBreakdown(lineup)`:**

```
avgEffectiveScore = mean over 5 slots of effectivePlayerScore(player, roleId)

chemistryFactor = 1.0 + min(rawPairs / 30, 1.0) × 0.15

iglFactor:
  if natural IGL in IGL slot → 1.0 + (# majors as IGL) × 0.01
  otherwise                  → IGL_ABSENT_FACTOR (0.90)

awpFactor:
  if natural AWPer in AWP slot → AWP_PRESENT_FACTOR (1.03)
  otherwise                    → AWP_ABSENT_FACTOR  (0.90)

finalStrength = round(avgEffectiveScore × chemistryFactor × iglFactor × awpFactor, 1)
```

**Math — `matchWinProbability(strengthA, strengthB)`:**

```
p = 1 / (1 + exp(-k × (strengthA - strengthB)))
  clamped to [MATCH_WIN_PROB_MIN, MATCH_WIN_PROB_MAX]
  where k = MATCH_LOGISTIC_K (0.05)

At k=0.05, a +10 strength advantage → ~62% win probability per map.
At k=0.05, a +40 strength advantage → ~86% win probability per map.
```

---

## `app/src/lib/tournament.js`

Swiss stage and playoff bracket simulation.

| Symbol | Line | Purpose |
|--------|------|---------|
| `STAGES` | 12 | Array of `{id, label, band}` for the three Swiss stages |
| `PLAYOFFS` | 18 | Array of `{id, label, band}` for QF, SF, Final |
| `SUB_BAND` | 41 | Map from net record (−2 to +2) to [lo, hi] sub-band fractions |

| Function | Line | Purpose |
|----------|------|---------|
| `simulateMatch(yourStrength, opponentStrength)` | 24 | Runs a best-of-3 map series via probabilistic coin flips, returns `{maps, won, score, winProbability}` |
| `pickFromBand(pool, band, usedIds, wins, losses)` | 49 | Selects a random opponent from the sub-band appropriate to current W-L record, excluding already-used IDs |
| `createTournamentRunner(yourStrength, teamMajors, gameMode)` | 66 | Returns a stateful iterator with a `.next()` method that simulates exactly one match per call |

**Math — `simulateMatch`:**

```
p = matchWinProbability(yourStrength, opponentStrength)
maps played until (yourMaps === 2 || theirMaps === 2):
  each map: won = Math.random() < p
score = "${yourMaps}-${theirMaps}"
```

**Math — `pickFromBand`:**

```
[s, e] = band (stage percentile range)
w = e - s
net = clamp(wins - losses, -2, 2)
[lo, hi] = SUB_BAND[net]
subStart = s + w × lo
subEnd   = s + w × hi
candidates = pool[floor(n × subStart) : max(floor(n × subStart)+1, floor(n × subEnd))]
             filtered by !usedIds
```

**`createTournamentRunner` state machine:**

```
stageQueue = [stage1, stage2, stage3]
playoffQueue = [quarterfinal, semifinal, final]
wins = 0, losses = 0

.next():
  if !inPlayoffs:
    opponent = pickFromBand(pool, currentStage.band, usedIds, wins, losses)
    match = simulateMatch(...)
    if losses >= 3 → done=true, champion=false, eliminatedStage=currentStage.label
    if wins  >= 3 → advance to next stage (or inPlayoffs=true)
    return { round, done: false }
  else:
    pRound = playoffQueue.shift()
    opponent = pickFromBand(pool, pRound.band, usedIds, 1, 0)
    match = simulateMatch(...)
    if !match.won → done=true, champion=false, eliminatedStage=pRound.label
    if playoffQueue.length===0 → done=true, champion=true
    return { round, done: false }
```

---

## `app/src/lib/attributeIcons.jsx`

Icon components and role attribute metadata for HLTV 3.0 mode.

| Export | Line | Purpose |
|--------|------|---------|
| `FirepowerIcon` | 4 | SVG icon for the Firepower attribute |
| `EntryingIcon` | 21 | SVG icon for the Entrying attribute |
| `TradingIcon` | 31 | SVG icon for the Trading attribute |
| `OpeningIcon` | 40 | SVG icon for the Opening attribute |
| `ClutchingIcon` | 53 | SVG icon for the Clutching attribute |
| `SnipingIcon` | 62 | SVG icon for the Sniping attribute |
| `UtilityIcon` | 70 | SVG icon for the Utility attribute |
| `ATTRIBUTE_DEFS` | 79 | Array of `{key, name, Icon}` for all 7 attributes — iteration order for vertical bars |
| `ROLE_KEY_ATTRIBUTES` | 90 | Map of roleId → `string[]` of key attribute keys, used for mini-bar display on LiveRosterBoard |

---

## `app/src/App.jsx`

Root component. Owns all game state and transitions.

### State variables

| Variable | Type | Purpose |
|----------|------|---------|
| `phase` | string | Current game phase: `intro\|mode\|spin\|draft\|place\|results` |
| `statsRevealed` | bool | Whether stats are shown during drafting |
| `gameMode` | string | `"classic"` or `"hltv3"` |
| `pickIndex` | number | 0-based index of the current pick (0–4) |
| `draftedPlayers` | array | `[{player, fromTeamMajor}]` — every player drafted so far |
| `assignments` | object | `{roleId: player\|null}` — players placed on the live board |
| `pendingPlayer` | player\|null | Player drafted but not yet placed into a slot |
| `resolvedTeamMajor` | team-era\|null | The team-era resolved by the current spin |
| `teamRerollsUsed` | number | Count of team rerolls consumed this game |
| `majorRerollsUsed` | number | Count of major rerolls consumed this game |
| `usedTeamMajorIds` | array | IDs of team-eras already used, passed to spinner to exclude near-duplicates |
| `rerollConstraint` | object\|null | `{type, major\|org, excludeId}` passed to SpinnerScreen for constrained re-spins |
| `iglPlayerId` | string\|null | Player ID of the designated IGL (HLTV 3.0 only) |

### Handlers

| Handler | Line | Purpose |
|---------|------|---------|
| `handleStart` | 31 | intro → mode |
| `handleModeChosen({statsRevealed, gameMode})` | 33 | mode → spin; sets mode state |
| `handleSpinResolved(teamEra)` | 39 | spin → draft; stores resolved team-era |
| `handleRerollTeam` | 45 | Consumes one team reroll; returns to spin with `type:"team"` constraint |
| `handleRerollMajor` | 52 | Consumes one major reroll; returns to spin with `type:"major"` constraint |
| `handlePlayerDrafted(player)` | 59 | draft → place; appends player to draftedPlayers, sets pendingPlayer |
| `handleDragEnd(event)` | 72 | Handles three drag-source types: draft-pool pick, IGL-badge assignment, placed-player rearrangement |
| `handleContinueAfterPlacement` | 151 | place → spin (next pick) or place → results (after 5th pick) |
| `handleRestart` | 160 | Resets all state back to mode screen |

### Local components

| Component | Line | Purpose |
|-----------|------|---------|
| `PlacementPrompt` | 249 | Contextual prompt shown during the `place` phase: drag instruction, IGL assignment prompt, or "rearrange freely" state |
| `TopBar` | 306 | Persistent header with logo, mode indicator dot |
| `Footer` | 329 | Attribution footer |

---

## `app/src/components/SpinnerScreen.jsx`

Slot-machine animation that resolves to a team-era.

| Symbol | Line | Purpose |
|--------|------|---------|
| `ALL_MAJORS` | 10 | Deduped list of all major names (for decoy reel entries) |
| `ALL_ORGS` | 11 | Deduped list of all org names (for decoy reel entries) |

| Function/Component | Line | Purpose |
|-------------------|------|---------|
| `SpinnerScreen` | 15 | Root component; manages spin lifecycle via `useState` + `useRef` timers |
| `runSpin(getResult)` | 33 | Generates decoy arrays, schedules three timeouts: major-settles, team-settles, navigate-to-draft |
| `handleInitialSpin` | 92 | Called by the Spin button; invokes `runSpin` with the appropriate spin function |
| `ReelLabel` | 202 | Small label above each reel showing idle/spinning/locked state |
| `ReelWindow` | 218 | The visible reel; CSS animation-driven scroll when spinning, static display when landed |
| `ScreenHeader` | 256 | Pick N/5 header with mode badge |

**Spin timing:**

```
t=0                   → reel animation starts
t=SPIN_TEAM_OFFSET_MS → team reel starts animating (600 ms)
t=SPIN_DURATION_MS    → major reel settles (1800 ms)
t=SPIN_DURATION_MS + SPIN_TEAM_OFFSET_MS → team reel settles (2400 ms)
t=above + SPIN_RESULT_DWELL_MS → navigate to draft (3400 ms)
```

---

## `app/src/components/DraftScreen.jsx`

Player selection panel shown while `phase === "draft"`.

| Component | Line | Purpose |
|-----------|------|---------|
| `DraftScreen` | 7 | Root component; filters eligible players (deduped by gamertag base), renders appropriate card type per mode |
| `PlayerCard` | 75 | Classic mode card: click or drag to pick; shows headshot, roles, optionally stats |
| `Hltv3PlayerCard` | 142 | HLTV 3.0 card: left photo as drag handle, right panel for clicking; shows HLTV 3.0 stats + attribute vertical bars + IGL badge |
| `Stat3` | 254 | Single HLTV 3.0 stat cell (label + value) |
| `StatBlock` | 265 | Single classic stat cell |
| `RoleLegend` | 282 | Footer legend for HLTV 3.0 mode; shown only when `gameMode === "hltv3"` |

---

## `app/src/components/LiveRosterBoard.jsx`

Right-sidebar board showing placed players and the pending pick. Slots are
drop targets; placed players are drag sources for rearrangement.

| Symbol | Line | Purpose |
|--------|------|---------|
| `HLTV3_SLOT_LABELS` | 17 | Display label map for HLTV 3.0 slot IDs |

| Function/Component | Line | Purpose |
|-------------------|------|---------|
| `LiveRosterBoard` | 25 | Root component; renders 5 role slots + IGL badge area (HLTV3) + pending card area |
| `buildOriginMap(draftedPlayers)` | 80 | Builds `{playerId → "Org · Major"}` label map from draft history |
| `IglBadgeArea` | 89 | HLTV3-only draggable IGL badge; shows currently designated IGL's name |
| `RoleSlot` | 137 | Drop target for a single role; shows slot label, key attribute mini-bars (HLTV3), occupant card or empty state |
| `DraggableCard` | 212 | Drag source for a placed player; shows name, role tags (classic), rating, fit indicator |
| `PendingCard` | 276 | Drag source for the unplaced pick; styled orange, shows roles and origin label |

**`topAttrs(player, n)`** (line 10): returns the player's top N attributes by score,
used to dynamically select which attribute bars to show in the star/awp slot.

---

## `app/src/components/StrengthBreakdown.jsx`

Results screen panel showing the final lineup with a full strength breakdown.

| Component | Line | Purpose |
|-----------|------|---------|
| `StrengthBreakdown` | 11 | Root; branches on `isHltv3` for stat tiles and multiplier tiles |
| `LineupCard` | 113 | Per-player card: role label, name, real name, fit badge (classic), mini stats |
| `StatTile` | 159 | Team average stat display cell |
| `MiniStat` | 168 | Compact stat within a LineupCard |
| `MultiplierTile` | 179 | Chemistry/IGL/AWP multiplier cell; green when positive, red when negative |

---

## `app/src/components/TournamentBracket.jsx`

Live-reveal tournament display. One match is simulated and revealed every
`REVEAL_DELAY_MS` (900 ms).

| Symbol | Line | Purpose |
|--------|------|---------|
| `REVEAL_DELAY_MS` | 5 | Milliseconds between successive match reveals |
| `STAGE_ORDER` | 7 | Display order of stage columns |
| `STAGE_LABELS` | 8 | Human-readable label per stage key |

| Component | Line | Purpose |
|-----------|------|---------|
| `TournamentBracket` | 15 | Root; creates runner on mount, drives `useEffect` tick loop, groups rounds into stage columns |
| `StageColumn` | 112 | One column per stage; shows all played rounds + animated "Playing…" pulse for the active stage |
| `RoundCard` | 138 | Single match result card; shows record label, score, opponent name, strength, hover lineup tooltip |

**Tick loop logic (lines 26–39):**

```
useEffect → setPending(true) → setTimeout(900ms):
  step = runner.next()
  setRounds(prev => [...prev, step.round])
  setPending(false)
  if step.done → setFinalState(...)
[dep: rounds, finalState]
```

`isActiveStage` (line 86): the active stage is determined by the last played
round's `.stage` key, defaulting to `"stage1"` before any round is played.

---

## `app/src/components/MathGuide.jsx`

Left-sidebar panel during the draft. Read-only; no state.

| Component | Line | Purpose |
|-----------|------|---------|
| `MathGuide` | 11 | Root; renders role guide and "how it works" blurbs |
| `Blurb` | 92 | Labelled paragraph helper |

---

## `app/src/components/IntroScreen.jsx`

Landing screen shown at `phase === "intro"`.

| Component | Line | Purpose |
|-----------|------|---------|
| `IntroScreen` | 3 | Headline, tagline, dataset stats (team count, player count), role overview cards |
| `Stat` | 64 | Labelled number display |

---

## `app/src/components/ModeSelectScreen.jsx`

Mode selection screen shown at `phase === "mode"`.

| Component | Line | Purpose |
|-----------|------|---------|
| `ModeSelectScreen` | 4 | Root; manages `selected` state, renders classic (disabled) and HLTV3 mode cards |
| `ModeCard` | 110 | Generic mode card — used for the disabled classic cards |
| `HLTV3Card` | 134 | HLTV 3.0 mode card (stats on) |
| `CSIQCard` | 164 | CS-IQ mode card (stats off, HLTV 3.0 pool) |

---

## `app/src/components/ResultsScreen.jsx`

Container shown at `phase === "results"`. Owns the pre-tournament state.

| Component | Line | Purpose |
|-----------|------|---------|
| `ResultsScreen` | 10 | Computes lineup and strength breakdown via `useMemo`, warms opponent pool cache, shows pre-tournament prompt or TournamentBracket |

`useMemo` calls (lines 14–28):
- `lineup` — maps slot order to `{roleId, player}` pairs
- `breakdown` — calls `computeStrengthBreakdown` or `computeStrengthBreakdownHltv3`
- opponent pool warming — calls `getOpponentPool` / `getOpponentPoolHltv3` to prime the cache before the first match tick

---

## `app/scripts/stats-editor-server.js`

Local Node.js HTTP server (port 3001) for importing HLTV stats into
`teams.json`. Not part of the browser bundle.

Key operations:
- `GET /` — serves the editor HTML UI
- `POST /parse` — accepts raw HLTV stat page text, parses stats via regex
- `POST /apply` — writes parsed stats into `teams.json`, filling only blank fields (existing values are never overwritten)
- Leet-normalization in `resolveAutoDetect`: maps `1→i 3→e 4→a 0→o 5→s 6→g 7→t 8→b 9→g` for fuzzy gamertag matching
- Partial team-name matching (team name overlap ≥ 50%) for import resolution

---

## `app/scripts/validate-dataset.js`

CLI script. Reads `teams.json` and reports:
- Duplicate player IDs
- Unknown role tags (not in the canonical set)
- Teams with fewer than 5 players
- Majors with fewer than 2 teams (would make the spinner feel rigged)
