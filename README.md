# Win The Major — CS GOAT Roster Builder

Build your all-time Counter-Strike five, then simulate a real Major to find out
how far they'd go.

Spin for a team at a real Major. Draft one player from that exact historical
roster. Repeat five times, assign everyone to a role, then watch your lineup
fight through a full Swiss + bracket tournament against real historical
team-eras from the dataset.

---

## Running locally

```bash
cd app
npm install
npm run dev
```

Vite will print the local URL (typically `http://localhost:5173`).

To build a production bundle:

```bash
npm run build
# → app/dist/ — deploy anywhere that serves static files
```

There is no backend. Everything runs in the browser from static files.

---

## How to play

### 1 — Choose a mode

| Mode | Pool | Stats visible while drafting |
|------|------|------------------------------|
| **HLTV 3.0** | CS2-era majors only (2024–2026) | RTG 3.0, KAST, KPR, DPR, attribute bars |
| **CS-IQ** | CS2-era majors only | Attribute bars only — no ratings |

> Classic mode (all eras, 2014–2024) is under construction.

### 2 — Spin and draft

A slot-machine spinner picks a random org + major from the eligible pool.
From the resolved roster — every player who had meaningful tenure at that
event — you draft **one** player. You have one reroll per type (team or major)
per game.

### 3 — Assign to a role

After each pick, drag the player into a role slot on the live board. Slots can
be rearranged at any time during the draft. Off-role placements are legal but
incur a penalty to that player's effective score.

**Classic roles:** AWP · Entry · Support · Lurker · IGL  
**HLTV 3.0 roles:** AWP · Entry · Support · Star · Lurker  
(HLTV 3.0 replaces the IGL slot with a Star rifler slot; you designate an IGL
separately via a drag-able badge, which applies a CS2-major bonus to your
team's final strength.)

### 4 — See your strength rating

After the fifth pick the Results screen shows your team's **Strength Rating**
with a full breakdown of every factor that went into it.

### 5 — Run the Major

A three-stage Swiss + bracket tournament:

| Phase | Format | Advance / Eliminate |
|-------|--------|---------------------|
| Opening Stage | Full Swiss | 3W advance · 3L out |
| Challengers Stage | Full Swiss | 3W advance · 3L out |
| Legends Stage | Full Swiss | 3W advance · 3L out |
| Playoffs | QF → SF → Grand Final | Single-elimination |

Opponents are real historical team-eras from the dataset, seeded by strength.
Your current W-L record within a stage shifts the sub-band of opponents you
draw from — 2-0 teams face the toughest opposition in the stage, 0-2 teams
face the easiest. Every match is best-of-3 maps, each map a weighted coin flip.

Results are revealed one match at a time.

---

## Dataset

`app/src/data/teams.json` is the single source of truth. It covers every CS2-era
major from PGL Copenhagen 2024 through IEM Cologne 2026.

Each team-era entry contains:

```json
{
  "id": "string",
  "org": "Team Name",
  "major": "PGL CS2 Major Copenhagen 2024",
  "region": "Country/Region",
  "placement": "Champions",
  "blurb": "Flavor text shown on the draft screen.",
  "players": [
    {
      "id": "gamertag_teamslug_majorslug",
      "name": "gamertag",
      "realName": "First Last",
      "nationality": "XX",
      "roles": ["awp", "entry"],
      "rating": 1.20,
      "kd": 1.22,
      "adr": 80.0,
      "impact": 1.16,
      "rating3": 1.18,
      "kast": 74.2,
      "kpr": 0.72,
      "dpr": 0.61,
      "multiKill": 12.3,
      "roundSwingPct": 8.1,
      "clutching": 70,
      "entrying": 40,
      "firepower": 80,
      "opening": 75,
      "sniping": 85,
      "trading": 55,
      "utility": 30
    }
  ]
}
```

Role IDs: `awp` `entry` `support` `lurker` `igl`  
Attribute fields (0–100): `clutching` `entrying` `firepower` `opening` `sniping` `trading` `utility`

### Validate after editing

```bash
cd app && node scripts/validate-dataset.js
```

Checks for duplicate player IDs, unknown role tags, and teams with fewer than
5 players.

### Add stats via the editor server

```bash
cd app && node scripts/stats-editor-server.js
# → http://localhost:3001
```

Paste HLTV stat pages; the server parses and imports them into `teams.json`,
filling only blank fields (existing data is never overwritten).

---

## Tuning

All game balance values live in `app/src/config.js`. Change a number and the
dev server hot-reloads instantly.

Key knobs:

| Constant | Default | Effect |
|----------|---------|--------|
| `MATCH_LOGISTIC_K` | `0.05` | Steepness of win-probability curve. Higher → fewer upsets |
| `MATCH_WIN_PROB_MIN/MAX` | `0.03 / 0.97` | Hard floor/ceiling on per-map win chance |
| `STAGE_BANDS` | see config | Which percentile slice of the opponent pool each stage draws from |
| `PLAYOFF_BANDS` | see config | Same, for QF/SF/Final |
| `ROLE_FIT_BONUS` | `1.00` | Multiplier when player is in their natural role |
| `ROLE_OFFROLE_PENALTY` | `0.80` | Multiplier when player is forced off-role |
| `HLTV3_IGL_CS2_MAJOR_BONUS` | `0.02` | Strength bonus per CS2 major the designated IGL has appeared at |
| `HLTV3_STAR_BOOST` | `1.05` | Extra weight applied to the star-slot player's score |
| `MAX_REROLLS_TEAM/MAJOR` | `1` | Number of team/major rerolls available per game |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Drag and drop | @dnd-kit/core |
| Fonts | Barlow Condensed · Inter · JetBrains Mono |
| Deployment | Render (static site via `render.yaml`) |
| Backend | None — fully client-side |
