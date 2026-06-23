// Validates src/data/teams.json after edits.
// Run with: node scripts/validate-dataset.js

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, "..", "src", "data", "teams.json");
const data = JSON.parse(readFileSync(dataPath, "utf-8"));

let hasErrors = false;

function fail(message) {
  console.error(`✗ ${message}`);
  hasErrors = true;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

const roleIds = new Set(data.roles.map((r) => r.id));
const eraChunks = new Set(data._meta.eraChunks);

// Check every team-era has exactly 5 players with valid, known roles.
const allPlayerIds = [];
const eraCounts = {};

for (const team of data.teamEras) {
  if (team.players.length < 5) {
    fail(`${team.id} has only ${team.players.length} players, need at least 5`);
  }
  if (!eraChunks.has(team.era)) {
    fail(`${team.id} has unknown era chunk "${team.era}"`);
  }
  eraCounts[team.era] = (eraCounts[team.era] || 0) + 1;

  for (const player of team.players) {
    allPlayerIds.push(player.id);
    for (const role of player.roles) {
      if (!roleIds.has(role)) {
        fail(`${player.id} (in ${team.id}) has unknown role "${role}"`);
      }
    }
    if (player.roles.length === 0) {
      fail(`${player.id} (in ${team.id}) has no roles assigned`);
    }
  }
}

// Duplicate player IDs across the whole dataset.
const seen = new Set();
const dupes = new Set();
for (const id of allPlayerIds) {
  if (seen.has(id)) dupes.add(id);
  seen.add(id);
}
if (dupes.size > 0) {
  fail(`Duplicate player IDs: ${[...dupes].join(", ")}`);
} else {
  ok(`${allPlayerIds.length} player IDs, all unique`);
}

// Warn (not fail) if any era chunk has fewer than 2 teams — the spinner
// will feel rigged/repetitive if there's only one possible landing spot.
for (const era of eraChunks) {
  const count = eraCounts[era] || 0;
  if (count < 2) {
    console.warn(`⚠ Era "${era}" has only ${count} team(s) — consider adding more so spins feel varied`);
  } else {
    ok(`Era "${era}": ${count} teams`);
  }
}

console.log(`\n${data.teamEras.length} team-eras, ${allPlayerIds.length} total players.`);

if (hasErrors) {
  console.error("\nValidation FAILED — fix the errors above.");
  process.exit(1);
} else {
  console.log("\nValidation passed.");
}
