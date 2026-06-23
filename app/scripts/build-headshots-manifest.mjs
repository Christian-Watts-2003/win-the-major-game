// Scans public/headshots/ and writes src/data/headshots.json
// Maps playerId -> "/headshots/filename.ext"
//
// For players without an exact headshot file, falls back to:
//   1. Any headshot for the same gamertag in the same year
//   2. The same gamertag's 2013 headshot if the major year is 2014
//
// Run automatically before vite build via package.json "build" script.

import { readdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { dirname, join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const headshotsDir = join(__dirname, "../public/headshots");
const outPath = join(__dirname, "../src/data/headshots.json");
const teamsPath = join(__dirname, "../src/data/teams.json");

if (!existsSync(headshotsDir)) {
  writeFileSync(outPath, "{}");
  console.log("No headshots directory — wrote empty manifest.");
  process.exit(0);
}

const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// Step 1: exact map from files on disk
const exact = {};
for (const file of readdirSync(headshotsDir)) {
  const ext = extname(file).toLowerCase();
  if (!EXTS.has(ext)) continue;
  const playerId = file.slice(0, -ext.length);
  exact[playerId] = `/headshots/${file}`;
}

// Step 2: build fallback map using teams.json
const map = { ...exact };
let fallbacks = 0;

if (existsSync(teamsPath)) {
  const { teamMajors } = JSON.parse(readFileSync(teamsPath, "utf8"));

  // gamertag -> [ { year, path } ] from exact headshots
  const byGamertag = {};
  for (const [id, path] of Object.entries(exact)) {
    const yearMatch = id.match(/(\d{4})[^_]*$/);
    if (!yearMatch) continue;
    const year = yearMatch[1];
    // gamertag is everything before the first _ that precedes the teamMajorId
    // We derive gamertag per-player below; here just store id->year for lookup
    byGamertag[id] = { year, path };
  }

  for (const team of teamMajors) {
    const teamYearMatch = team.id.match(/(\d{4})[^_]*$/);
    if (!teamYearMatch) continue;
    const teamYear = teamYearMatch[1];

    for (const player of team.players) {
      if (exact[player.id]) continue; // already has exact headshot

      // gamertag = player.id minus the trailing _{teamMajorId}
      const gamertag = player.id.slice(0, player.id.length - team.id.length - 1);

      // Try: same gamertag, same year
      const sameYear = Object.entries(exact).find(([id]) => {
        if (!id.startsWith(gamertag + "_")) return false;
        const m = id.match(/(\d{4})[^_]*$/);
        return m && m[1] === teamYear;
      });

      if (sameYear) {
        map[player.id] = sameYear[1];
        fallbacks++;
        continue;
      }

      // 2013/2014 special case: use 2013 headshot for 2014 majors
      if (teamYear === "2014") {
        const y2013 = Object.entries(exact).find(([id]) => {
          if (!id.startsWith(gamertag + "_")) return false;
          const m = id.match(/(\d{4})[^_]*$/);
          return m && m[1] === "2013";
        });
        if (y2013) {
          map[player.id] = y2013[1];
          fallbacks++;
        }
      }
    }
  }
}

writeFileSync(outPath, JSON.stringify(map, null, 2));
console.log(`Headshots manifest: ${Object.keys(exact).length} exact + ${fallbacks} fallbacks = ${Object.keys(map).length} entries -> src/data/headshots.json`);
