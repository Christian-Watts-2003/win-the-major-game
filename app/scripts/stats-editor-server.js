// Simple local web editor for filling in player stats.
// Serves a browser UI at http://localhost:3737
//
// Run: node scripts/stats-editor-server.js

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const teamsPath = join(__dirname, "../src/data/teams.json");
const headshotsDir = join(__dirname, "../public/headshots");
const PORT = 3737;

if (!existsSync(headshotsDir)) mkdirSync(headshotsDir, { recursive: true });

function load() {
  return JSON.parse(readFileSync(teamsPath, "utf8"));
}

function save(data) {
  writeFileSync(teamsPath, JSON.stringify(data, null, 2));
}

const HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CSGoat Stats Editor</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; }
  header { background: #1a1d27; border-bottom: 1px solid #2d3148; padding: 12px 24px; display: flex; align-items: center; gap: 16px; position: sticky; top: 0; z-index: 10; }
  header h1 { font-size: 1rem; font-weight: 600; color: #f8fafc; }
  .nav-tabs { display: flex; gap: 4px; }
  .nav-tab { background: none; border: 1px solid transparent; border-radius: 5px; color: #64748b; font-size: 0.8rem; padding: 5px 14px; cursor: pointer; }
  .nav-tab:hover { color: #e2e8f0; border-color: #2d3148; }
  .nav-tab.active { background: #1e3a5f; border-color: #3b82f6; color: #93c5fd; }
  .status { font-size: 0.8rem; color: #64748b; margin-left: auto; }
  .status.saved { color: #22c55e; }
  .status.error { color: #ef4444; }
  .layout { display: grid; grid-template-columns: 260px 1fr; height: calc(100vh - 49px); }
  .sidebar { background: #13161f; border-right: 1px solid #2d3148; overflow-y: auto; padding: 8px 0; }
  .major-group { margin-bottom: 4px; }
  .major-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; padding: 10px 16px 4px; }
  .team-btn { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 6px 16px; font-size: 0.8rem; background: none; border: none; color: #94a3b8; cursor: pointer; transition: background 0.1s; }
  .team-btn:hover { background: #1e2235; color: #e2e8f0; }
  .team-btn.active { background: #1e3a5f; color: #93c5fd; }
  .team-btn .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .dot-empty { background: #ef4444; }
  .dot-partial { background: #f59e0b; }
  .dot-done { background: #22c55e; }
  .main { overflow-y: auto; padding: 24px; }
  .main h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 4px; }
  .major-tag { font-size: 0.75rem; color: #64748b; margin-bottom: 20px; }
  .player-card { background: #1a1d27; border: 1px solid #2d3148; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .player-top { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
  .player-name { font-weight: 600; font-size: 0.95rem; color: #f1f5f9; }
  .headshot-zone { width: 64px; height: 64px; border-radius: 6px; border: 2px dashed #2d3148; background: #0f1117; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; transition: border-color 0.15s; position: relative; }
  .headshot-zone:hover, .headshot-zone.drag-over { border-color: #3b82f6; }
  .headshot-zone img { width: 100%; height: 100%; object-fit: cover; }
  .headshot-zone .hs-placeholder { font-size: 0.6rem; color: #475569; text-align: center; line-height: 1.3; padding: 4px; pointer-events: none; }
  .headshot-zone input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .real-name-row { margin-bottom: 12px; }
  .real-name-row label { font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 4px; }
  .real-name-row input { width: 100%; background: #0f1117; border: 1px solid #2d3148; border-radius: 4px; padding: 6px 10px; color: #e2e8f0; font-size: 0.85rem; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .stat-field label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block; margin-bottom: 4px; }
  .stat-field input { width: 100%; background: #0f1117; border: 1px solid #2d3148; border-radius: 4px; padding: 6px 10px; color: #e2e8f0; font-size: 0.95rem; font-variant-numeric: tabular-nums; }
  .stat-field input:focus { outline: none; border-color: #3b82f6; }
  .stat-field input.filled { border-color: #2d5a27; }
  .roles-row { margin-top: 10px; }
  .roles-row label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block; margin-bottom: 6px; }
  .roles-toggles { display: flex; flex-wrap: wrap; gap: 6px; }
  .role-btn { background: #0f1117; border: 1px solid #2d3148; border-radius: 4px; color: #64748b; font-size: 0.75rem; padding: 4px 10px; cursor: pointer; transition: background 0.1s, color 0.1s, border-color 0.1s; }
  .role-btn.on { background: #1e3a5f; border-color: #3b82f6; color: #93c5fd; }
  .team-meta { background: #1a1d27; border: 1px solid #2d3148; border-radius: 8px; padding: 16px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .meta-field label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block; margin-bottom: 4px; }
  .meta-field input, .meta-field select { width: 100%; background: #0f1117; border: 1px solid #2d3148; border-radius: 4px; padding: 6px 10px; color: #e2e8f0; font-size: 0.85rem; }
  .save-btn { margin-top: 16px; background: #1d4ed8; color: white; border: none; border-radius: 6px; padding: 10px 24px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
  .save-btn:hover { background: #2563eb; }
  .filter-bar { padding: 8px 12px; border-bottom: 1px solid #2d3148; }
  .filter-bar input { width: 100%; background: #0f1117; border: 1px solid #2d3148; border-radius: 4px; padding: 5px 10px; color: #e2e8f0; font-size: 0.8rem; }
  .legend { display: flex; gap: 12px; padding: 8px 16px; font-size: 0.7rem; color: #64748b; border-bottom: 1px solid #2d3148; }
  .legend span { display: flex; align-items: center; gap: 4px; }
  .empty-state { color: #475569; text-align: center; margin-top: 80px; font-size: 0.9rem; }
  .push-panel { padding: 32px; max-width: 640px; }
  .push-panel h2 { font-size: 1rem; font-weight: 600; margin-bottom: 6px; }
  .push-panel p { font-size: 0.82rem; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
  .cmd-block { background: #0f1117; border: 1px solid #2d3148; border-radius: 6px; padding: 14px 16px; margin-bottom: 16px; }
  .cmd-block .cmd-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 8px; }
  .cmd-block pre { font-family: monospace; font-size: 0.85rem; color: #93c5fd; white-space: pre-wrap; margin: 0; }
  .copy-btn { margin-top: 8px; background: #1e2235; border: 1px solid #2d3148; border-radius: 4px; color: #94a3b8; font-size: 0.75rem; padding: 4px 12px; cursor: pointer; }
  .copy-btn:hover { border-color: #3b82f6; color: #93c5fd; }
  .copy-btn.copied { border-color: #22c55e; color: #22c55e; }
  .section-divider { margin-top: 14px; padding-top: 14px; border-top: 1px solid #1e3a5f; }
  .section-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #3b82f6; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: #1e3a5f; }
  .stats-grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
  .breakdown-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .attr-field label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #3b82f6; display: block; margin-bottom: 4px; }
  .attr-field input { width: 100%; background: #0f1117; border: 1px solid #1e3a5f; border-radius: 4px; padding: 6px 8px; color: #93c5fd; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
  .attr-field input:focus { outline: none; border-color: #3b82f6; }
  .attr-field input.filled { border-color: #1d4ed8; background: #0d1b30; }
  .import-panel { padding: 32px; max-width: 860px; }
  .import-panel h2 { font-size: 1rem; font-weight: 600; margin-bottom: 6px; }
  .import-panel p { font-size: 0.82rem; color: #64748b; line-height: 1.5; margin-bottom: 20px; }
  .import-controls { display: flex; gap: 12px; margin-bottom: 20px; align-items: flex-end; flex-wrap: wrap; }
  .import-controls label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block; margin-bottom: 4px; }
  .import-controls select { background: #0f1117; border: 1px solid #2d3148; border-radius: 4px; padding: 6px 10px; color: #e2e8f0; font-size: 0.85rem; min-width: 200px; }
  .paste-zone { border: 1px solid #2d3148; border-radius: 8px; margin-bottom: 20px; }
  .paste-zone label { display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; padding: 10px 14px 4px; }
  .paste-zone textarea { width: 100%; background: #0f1117; border: none; border-top: 1px solid #2d3148; border-radius: 0 0 8px 8px; color: #94a3b8; font-size: 0.78rem; font-family: monospace; padding: 12px 14px; resize: vertical; min-height: 120px; outline: none; }
  .paste-zone textarea:focus { border-top-color: #3b82f6; }
  .parse-btn { background: #1e3a5f; border: 1px solid #3b82f6; border-radius: 6px; color: #93c5fd; font-size: 0.85rem; font-weight: 600; padding: 8px 20px; cursor: pointer; margin-bottom: 20px; }
  .parse-btn:hover { background: #1d4ed8; color: white; }
  .preview-box { background: #13161f; border: 1px solid #2d3148; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
  .preview-row { display: flex; gap: 0; }
  .preview-row .pr-label { width: 200px; flex-shrink: 0; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; padding: 8px 12px; border-bottom: 1px solid #1e2235; }
  .preview-row .pr-val { flex: 1; font-size: 0.82rem; color: #93c5fd; font-variant-numeric: tabular-nums; padding: 8px 12px; border-bottom: 1px solid #1e2235; }
  .preview-row:last-child .pr-label, .preview-row:last-child .pr-val { border-bottom: none; }
  .preview-row.section-head .pr-label { color: #3b82f6; background: #0d1b30; }
  .preview-row.section-head .pr-val { background: #0d1b30; }
  .preview-summary { font-size: 0.8rem; color: #64748b; margin-bottom: 10px; }
  .preview-summary .ok { color: #22c55e; }
  .preview-summary .warn { color: #f59e0b; }
  .apply-btn { background: #15803d; color: white; border: none; border-radius: 6px; padding: 10px 28px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
  .apply-btn:hover { background: #16a34a; }
  .apply-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
</head>
<body>
<header>
  <h1>CSGoat Stats Editor</h1>
  <nav class="nav-tabs">
    <button class="nav-tab active" onclick="switchTab('stats')">Stats</button>
    <button class="nav-tab" onclick="switchTab('import')">Import HLTV</button>
    <button class="nav-tab" onclick="switchTab('push')">Push Guide</button>
  </nav>
  <span class="status" id="status">Select a team</span>
</header>
<div class="layout" id="stats-view">
  <div class="sidebar">
    <div class="filter-bar"><input id="search" placeholder="Search teams…" oninput="filterTeams(this.value)"></div>
    <div class="legend">
      <span><span class="dot dot-empty"></span> empty</span>
      <span><span class="dot dot-partial"></span> partial</span>
      <span><span class="dot dot-done"></span> done</span>
    </div>
    <div id="team-list"></div>
  </div>
  <div class="main" id="main"><div class="empty-state">Select a team from the sidebar to edit stats.</div></div>
</div>

<div id="push-view" style="display:none; overflow-y:auto; height:calc(100vh - 49px)">
  <div class="push-panel">
    <h2>Save Your Work</h2>
    <p>Run these commands from <code style="color:#93c5fd">C:\Users\watts\CSGoat-2.0</code> after each editing session to push your data to GitHub.</p>

    <div class="cmd-block">
      <div class="cmd-label">Step 1 — Rebuild headshots manifest</div>
      <pre>node scripts/build-headshots-manifest.mjs</pre>
      <button class="copy-btn" onclick="copyCmd(this, 'node scripts/build-headshots-manifest.mjs')">Copy</button>
    </div>

    <div class="cmd-block">
      <div class="cmd-label">Step 2 — Stage data files</div>
      <pre>git add app/src/data/teams.json app/src/data/headshots.json app/public/headshots/</pre>
      <button class="copy-btn" onclick="copyCmd(this, 'git add app/src/data/teams.json app/src/data/headshots.json app/public/headshots/')">Copy</button>
    </div>

    <div class="cmd-block">
      <div class="cmd-label">Step 3 — Commit</div>
      <pre>git commit -m "Update player data and headshots"</pre>
      <button class="copy-btn" onclick="copyCmd(this, 'git commit -m \"Update player data and headshots\"')">Copy</button>
    </div>

    <div class="cmd-block">
      <div class="cmd-label">Step 4 — Push to main</div>
      <pre>git push origin main</pre>
      <button class="copy-btn" onclick="copyCmd(this, 'git push origin main')">Copy</button>
    </div>

    <div class="cmd-block">
      <div class="cmd-label">All-in-one</div>
      <pre>node scripts/build-headshots-manifest.mjs &amp;&amp; git add app/src/data/teams.json app/src/data/headshots.json app/public/headshots/ &amp;&amp; git commit -m "Update player data and headshots" &amp;&amp; git push origin main</pre>
      <button class="copy-btn" onclick="copyCmd(this, 'node scripts/build-headshots-manifest.mjs && git add app/src/data/teams.json app/src/data/headshots.json app/public/headshots/ && git commit -m \"Update player data and headshots\" && git push origin main')">Copy</button>
    </div>
  </div>
</div>

<div id="import-view" style="display:none; overflow-y:auto; height:calc(100vh - 49px)">
  <div class="import-panel">
    <h2>Import HLTV 3.0 Stats</h2>
    <p>
      Select the major, team, and player. Then go to that player's HLTV stats page
      (e.g. <code>hltv.org/stats/players/&lt;id&gt;/&lt;name&gt;?event=&lt;eventId&gt;</code>),
      right-click → <strong>View Page Source</strong>, select all, and paste below.
      The parser extracts Rating 3.0, KAST, KPR, DPR, Multi-kill %, Round swing %, ADR,
      and all 7 role attributes automatically.
    </p>

    <div class="import-controls">
      <div>
        <label>Major</label>
        <select id="import-major" onchange="importMajorChanged()">
          <option value="">— select major —</option>
          <option>PGL CS2 Major Copenhagen 2024</option>
          <option>Perfect World Shanghai Major 2024</option>
          <option>BLAST.tv Austin Major 2025</option>
          <option>StarLadder Budapest Major 2025</option>
          <option>IEM Cologne 2026</option>
        </select>
      </div>
      <div>
        <label>Team</label>
        <select id="import-team" onchange="importTeamChanged()">
          <option value="">— select team —</option>
        </select>
      </div>
      <div>
        <label>Player</label>
        <select id="import-player">
          <option value="">— select player —</option>
        </select>
      </div>
    </div>

    <div class="paste-zone">
      <label for="import-paste">Paste page source (Ctrl+A, Ctrl+C from View Page Source)</label>
      <textarea id="import-paste" placeholder="Paste raw HTML source here…"></textarea>
    </div>

    <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap">
      <button class="parse-btn" style="margin-bottom:0" onclick="parseAndPreview()">Parse &amp; Preview</button>
      <button class="apply-btn" id="import-apply-btn" style="display:none" onclick="applyImport()">Apply to teams.json</button>
    </div>

    <div id="import-debug" style="display:none;background:#0d1b30;border:1px solid #1e3a5f;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:0.78rem;color:#93c5fd;line-height:1.8"></div>

    <div id="import-preview" style="display:none">
      <div class="preview-summary" id="import-summary"></div>
      <div class="preview-box" id="import-preview-box"></div>
    </div>
  </div>
</div>

<script>
let allData = null;
let currentKey = null;
let headshots = {};

const CS2_ADVANCED_MAJORS = new Set([
  "PGL CS2 Major Copenhagen 2024",
  "Perfect World Shanghai Major 2024",
  "BLAST.tv Austin Major 2025",
  "StarLadder Budapest Major 2025",
  "IEM Cologne 2026",
]);

function switchTab(tab) {
  document.getElementById('stats-view').style.display  = tab === 'stats'  ? 'grid'  : 'none';
  document.getElementById('import-view').style.display = tab === 'import' ? 'block' : 'none';
  document.getElementById('push-view').style.display   = tab === 'push'   ? 'block' : 'none';
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().startsWith(tab)));
}

// ── HLTV Import ──────────────────────────────────────────────────────────────

let importParsed = null; // { playerId, playerName, org, major, stats }

function importMajorChanged() {
  const major = document.getElementById('import-major').value;
  const teamSel = document.getElementById('import-team');
  teamSel.innerHTML = '<option value="">— select team —</option>';
  document.getElementById('import-player').innerHTML = '<option value="">— select player —</option>';
  document.getElementById('import-preview').style.display = 'none';
  importParsed = null;
  if (!major || !allData) return;
  const teams = allData.teamMajors.filter(t => t.major === major);
  for (const t of teams) {
    const opt = document.createElement('option');
    opt.value = t.org;
    opt.textContent = t.org;
    teamSel.appendChild(opt);
  }
}

function importTeamChanged() {
  const major = document.getElementById('import-major').value;
  const org   = document.getElementById('import-team').value;
  const playerSel = document.getElementById('import-player');
  playerSel.innerHTML = '<option value="">— select player —</option>';
  document.getElementById('import-preview').style.display = 'none';
  importParsed = null;
  if (!major || !org || !allData) return;
  const team = allData.teamMajors.find(t => t.org === org && t.major === major);
  if (!team) return;
  for (const p of team.players) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    playerSel.appendChild(opt);
  }
}

// Extract the event date range that HLTV embeds in filter links throughout
// a player stats page, e.g. ?startDate=2026-06-02&endDate=2026-06-21.
// Works on the raw HTML string before any DOM parsing (dates appear in actual
// href attributes even inside the browser view-source wrapper).
function extractHltvDateRange(htmlStr) {
  const m = htmlStr.match(/[?&]startDate=(\d{4}-\d{2}-\d{2})(?:&amp;|&)endDate=(\d{4}-\d{2}-\d{2})/);
  if (!m) return { start: null, end: null };
  return { start: m[1], end: m[2] };
}

// When the user pastes from Ctrl+U → View Page Source, the browser wraps the
// raw HTML in its own syntax-highlighted table (<td class="line-content">…</td>).
// DOMParser then sees the viewer's HTML rather than the HLTV page's HTML, so
// class-based selectors fail. Detect this format and reconstruct the real HTML
// from the text content of the line cells (which decodes &lt; → < etc.).
function unwrapViewSource(doc) {
  const lineContents = doc.querySelectorAll('td.line-content');
  if (lineContents.length < 50) return null;
  const rawHtml = [...lineContents].map(td => td.textContent).join('\n');
  return new DOMParser().parseFromString(rawHtml, 'text/html');
}

function parseHltvPlayerPage(htmlStr) {
  // Date extraction runs on the raw string — works in both wrapped and unwrapped form.
  const { start, end } = extractHltvDateRange(htmlStr);

  const parser = new DOMParser();
  let doc = parser.parseFromString(htmlStr, 'text/html');

  // Unwrap browser view-source pages so DOM selectors work against the real HLTV HTML.
  const unwrapped = unwrapViewSource(doc);
  if (unwrapped) doc = unwrapped;

  const stats = {};
  const meta = {};

  // Carry dates forward so resolveAutoDetect can match them to a major.
  if (start) meta._hltvStartDate = start;
  if (end)   meta._hltvEndDate   = end;

  // Real name — try the dedicated element first, then fall back to the bodyshot img alt
  const realNameEl = doc.querySelector('.player-summary-stat-box-left-player-name') ||
                     doc.querySelector('.playerRealname') ||
                     doc.querySelector('[class*="realname" i]');
  if (realNameEl) {
    const rn = realNameEl.textContent.trim();
    if (rn) meta.realName = rn;
  } else {
    const bodyshot = doc.querySelector('.player-summary-stat-box-left-bodyshot');
    if (bodyshot) {
      // alt = "Tynan 'TjP' Purtell" → strip the 'gamertag' part to get real name
      const alt = bodyshot.getAttribute('alt') || '';
      const stripped = alt.replace(/'[^']*'\s*/g, '').trim();
      if (stripped) meta.realName = stripped;
    }
  }

  // Rating (shown as Rating 3.0 on the page — used for both rating and rating3 fields)
  const rating3El = doc.querySelector('.player-summary-stat-box-rating-data-text');
  if (rating3El) {
    const v = parseFloat(rating3El.textContent.trim());
    if (!isNaN(v)) { stats.rating3 = v; stats.rating = v; }
  }

  // Stat wrappers: Round Swing has NO .traditionalData class; DPR/KAST/etc do.
  // Strategy: for each wrapper, prefer .traditionalData value/label; fall back to
  // the first non-hidden, non-ecoAdjusted value/label pair.
  const wrappers = [...doc.querySelectorAll('.player-summary-stat-box-data-wrapper')];
  for (const w of wrappers) {
    // Value: prefer .traditionalData, else first element that isn't hidden/eco
    const valEl = w.querySelector('.player-summary-stat-box-data.traditionalData') ||
      [...w.querySelectorAll('.player-summary-stat-box-data')]
        .find(el => !el.classList.contains('hidden') && !el.classList.contains('ecoAdjustedData'));
    // Label: same priority
    const labelEl = w.querySelector('.player-summary-stat-box-data-text.traditionalData') ||
      [...w.querySelectorAll('.player-summary-stat-box-data-text')]
        .find(el => !el.classList.contains('hidden') && !el.classList.contains('ecoAdjustedData'));
    if (!valEl || !labelEl) continue;

    // Strip inner tooltip text from label
    const labelText = (labelEl.firstChild?.nodeValue || labelEl.textContent).trim().toLowerCase();
    // Strip % and any inner span text from value
    const rawVal = (valEl.firstChild?.nodeValue || valEl.textContent).trim().replace('%','').trim();
    const val = parseFloat(rawVal);
    if (isNaN(val)) continue;

    if (labelText.includes('round swing'))  stats.roundSwingPct = val;
    else if (labelText === 'dpr')           stats.dpr = val;
    else if (labelText === 'kast')          stats.kast = val;
    else if (labelText.includes('multi'))   stats.multiKill = val;
    else if (labelText === 'adr')           stats.adr = val;
    else if (labelText === 'kpr')           stats.kpr = val;
  }

  // Classic stats — HLTV uses .stats-row divs: <div class="stats-row"><span>Label</span><span>Value</span></div>
  // Impact uses: <span>Impact rating</span><span class="strong">0.67</span> as siblings.
  const statsRowEls = [...doc.querySelectorAll('.stats-row')];
  for (const row of statsRowEls) {
    const spans = [...row.querySelectorAll('span')];
    if (spans.length < 2) continue;
    const label = spans[0].textContent.trim().toLowerCase();
    const raw   = spans[spans.length - 1].textContent.trim();
    const val   = parseFloat(raw);
    if (isNaN(val)) continue;
    if (label === 'k/d ratio' || label === 'k/d')  stats.kd = val;
    else if (label === 'adr' && stats.adr === undefined) stats.adr = val;
    else if (label === 'impact rating' || label === 'impact') stats.impact = val;
  }

  // Fallback: span sibling pattern "Impact rating" + <span class="strong">
  if (stats.impact === undefined) {
    const allSpans = [...doc.querySelectorAll('span')];
    for (const el of allSpans) {
      const label = el.textContent.trim().toLowerCase();
      if (label === 'impact rating' || label === 'impact') {
        const next = el.nextElementSibling;
        if (next) {
          const v = parseFloat(next.textContent.trim());
          if (!isNaN(v)) stats.impact = v;
        }
      }
      if ((label === 'k/d ratio' || label === 'k/d') && stats.kd === undefined) {
        const next = el.nextElementSibling;
        if (next) {
          const v = parseFloat(next.textContent.trim());
          if (!isNaN(v)) stats.kd = v;
        }
      }
    }
  }

  // Role attributes — combined side score (may be "0/100" when 0, so read firstChild text only)
  for (const roleName of ['firepower','entrying','trading','opening','clutching','sniping','utility']) {
    const section = doc.querySelector('.role-stats-section.role-' + roleName);
    if (!section) continue;
    const combined = section.querySelector('.role-stats-section-title-wrapper.stats-side-combined');
    if (!combined) continue;
    const scoreEl = combined.querySelector('.row-stats-section-score');
    if (!scoreEl) continue;
    const rawScore = (scoreEl.firstChild?.nodeValue || scoreEl.textContent).trim().replace('/100','').trim();
    const v = parseInt(rawScore, 10);
    if (!isNaN(v)) stats[roleName] = v;
  }

  return { stats, meta };
}

function autoDetectPlayerContext(rawDoc) {
  // Unwrap view-source pages so selectors hit real HLTV DOM elements.
  const doc = unwrapViewSource(rawDoc) || rawDoc;

  const gamertag = doc.querySelector('.player-summary-stat-box-left-nickname')?.textContent.trim() || null;

  // Team logo alt is the cleanest team signal, but HLTV's filtered stats
  // page sometimes omits it. Grab it when present; resolveAutoDetect can
  // find the player by gamertag+dates alone when it's absent.
  const teamLogoEl = doc.querySelector('.player-summary-stat-box-left-team-logo');
  const teamNameRaw = teamLogoEl ? teamLogoEl.getAttribute('alt') : null;

  // context-item-name elements include both player and event entries;
  // the event entry has no nested <img> (flag images ARE present on player rows).
  const eventEl = [...doc.querySelectorAll('.context-item-name')].find(el => !el.querySelector('img'));
  const eventName = eventEl ? eventEl.textContent.trim() : null;

  return { gamertag, teamNameRaw, eventName };
}

function resolveAutoDetect(gamertag, teamNameRaw, eventName, hltvStartDate, hltvEndDate) {
  if (!allData || !gamertag) return null;
  const norm = s => s.toLowerCase().replace(/\s+/g, '');

  // ── Step 1: identify the major ──────────────────────────────────────────────

  // Primary: date range from _meta.majorDates (unique, requires fetch-major-dates.mjs).
  let major = null;
  if (hltvStartDate && hltvEndDate && allData._meta?.majorDates) {
    for (const [name, dates] of Object.entries(allData._meta.majorDates)) {
      if (dates.start === hltvStartDate && dates.end === hltvEndDate) {
        major = name;
        break;
      }
    }
  }

  // Fallback: event-name keyword matching (works even without seeded dates).
  if (!major && eventName) {
    const MAJOR_KEYS = [
      { major: 'PGL CS2 Major Copenhagen 2024',         words: ['copenhagen', '2024'] },
      { major: 'Perfect World Shanghai Major 2024', words: ['shanghai',   '2024'] },
      { major: 'BLAST.tv Austin Major 2025',        words: ['austin',     '2025'] },
      { major: 'StarLadder Budapest Major 2025',    words: ['budapest',   '2025'] },
      { major: 'IEM Cologne 2026',                  words: ['cologne',    '2026'] },
    ];
    const eLower = eventName.toLowerCase();
    const entry = MAJOR_KEYS.find(e => e.words.every(w => eLower.includes(w)));
    if (entry) major = entry.major;
  }

  if (!major) return null;

  // ── Step 2: find the player ─────────────────────────────────────────────────
  // Once the major is known via dates, team name is not needed — search all
  // teams in the major for a matching gamertag. Use team name as a tiebreaker
  // only if provided (in case two orgs ever share a player slug, which is rare).

  const majorTeams = allData.teamMajors.filter(t => t.major === major);
  const teamNorm   = teamNameRaw ? norm(teamNameRaw) : null;
  // Normalize leet-speak substitutions (dev1ce↔device, s1mple↔simple, etc.)
  const normLeet = s => s.toLowerCase()
    .replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e')
    .replace(/4/g,'a').replace(/5/g,'s').replace(/6/g,'g')
    .replace(/7/g,'t').replace(/8/g,'b').replace(/9/g,'g');

  for (const team of majorTeams) {
    if (teamNorm && !norm(team.org).includes(teamNorm) && !teamNorm.includes(norm(team.org))) continue;
    const gtLower = gamertag.toLowerCase();
    const gtLeet  = normLeet(gamertag);
    const player = team.players.find(p => {
      const pLower = p.name.toLowerCase();
      const pLeet  = normLeet(p.name);
      return pLower === gtLower
        || pLower.includes(gtLower) || gtLower.includes(pLower)
        || pLeet  === gtLeet
        || pLeet.includes(gtLeet)   || gtLeet.includes(pLeet);
    });
    if (player) return { major, org: team.org, playerId: player.id, playerName: player.name };
  }

  return null;
}

function parseAndPreview() {
  const htmlStr  = document.getElementById('import-paste').value.trim();
  if (!htmlStr) { alert('Paste the page source HTML first.'); return; }

  let major    = document.getElementById('import-major').value;
  let org      = document.getElementById('import-team').value;
  let playerId = document.getElementById('import-player').value;

  if (!major || !org || !playerId) {
    const parser = new DOMParser();
    const preDoc = parser.parseFromString(htmlStr, 'text/html');

    // Detect view-source wrapping before handing to autoDetectPlayerContext.
    const lineContentCount = preDoc.querySelectorAll('td.line-content').length;
    const isViewSource = lineContentCount >= 50;

    const { gamertag, teamNameRaw, eventName } = autoDetectPlayerContext(preDoc);
    const { start: hltvStart, end: hltvEnd } = extractHltvDateRange(htmlStr);

    const dbg = document.getElementById('import-debug');
    if (dbg) {
      dbg.style.display = 'block';
      dbg.innerHTML =
        '<b>Auto-detect trace</b><br>' +
        'View-source format: <b>' + (isViewSource ? 'yes (' + lineContentCount + ' lines)' : 'no') + '</b><br>' +
        'Gamertag: <b>' + (gamertag || '—') + '</b><br>' +
        'Dates from page: <b>' + (hltvStart ? hltvStart + ' → ' + hltvEnd : '—') + '</b><br>' +
        'majorDates in dataset: <b>' + (allData._meta?.majorDates ? Object.keys(allData._meta.majorDates).join(', ') : 'none') + '</b>';
    }

    const resolved = resolveAutoDetect(gamertag, teamNameRaw, eventName, hltvStart, hltvEnd);
    if (resolved) {
      major    = resolved.major;
      org      = resolved.org;
      playerId = resolved.playerId;
      if (dbg) dbg.innerHTML += '<br>Resolved: <b>' + resolved.playerName + ' @ ' + resolved.org + ' — ' + resolved.major + '</b>';
      document.getElementById('import-major').value = major;
      importMajorChanged();
      document.getElementById('import-team').value = org;
      importTeamChanged();
      document.getElementById('import-player').value = playerId;
    } else {
      if (dbg) dbg.innerHTML += '<br><span style="color:#ef4444">Resolution failed — select manually above.</span>';
      alert('Could not auto-detect major/team/player from this page. Please select them manually.');
      return;
    }
  }

  const team = allData.teamMajors.find(t => t.org === org && t.major === major);
  if (!team) { alert('Team not found.'); return; }
  const player = team.players.find(p => p.id === playerId);
  if (!player) { alert('Player not found.'); return; }

  const { stats, meta: rawMeta } = parseHltvPlayerPage(htmlStr);
  // Strip internal routing hints before counting / displaying / applying.
  const { _hltvStartDate, _hltvEndDate, ...meta } = rawMeta;
  const fieldCount = Object.keys(stats).length + Object.keys(meta).length;

  importParsed = { playerId, playerName: player.name, org, major, stats, meta };

  const summary = document.getElementById('import-summary');
  summary.innerHTML = fieldCount > 0
    ? '<span class="ok">' + fieldCount + ' field' + (fieldCount===1?'':'s') + ' parsed</span> for <strong>' + esc(player.name) + '</strong>'
    : '<span class="warn">No recognisable stats found. Paste the page source of an individual HLTV player stats page.</span>';

  const LABELS = {
    realName: 'Real Name',
    rating: 'Rating', kd: 'K/D', adr: 'ADR', impact: 'Impact',
    rating3: 'Rating 3.0', kast: 'KAST %', kpr: 'KPR', dpr: 'DPR',
    multiKill: 'Multi-kill %', roundSwingPct: 'Round swing %',
    firepower: 'Firepower', entrying: 'Entrying', trading: 'Trading',
    opening: 'Opening', clutching: 'Clutching', sniping: 'Sniping', utility: 'Utility',
  };
  const META_ORDER  = ['realName'];
  const CLASS_ORDER = ['rating','kd','adr','impact'];
  const STAT_ORDER  = ['rating3','kast','kpr','dpr','multiKill','roundSwingPct'];
  const ATTR_ORDER  = ['firepower','entrying','trading','opening','clutching','sniping','utility'];

  let html = '';

  const metaFields = META_ORDER.filter(f => meta[f] !== undefined);
  if (metaFields.length) {
    html += '<div class="preview-row section-head"><div class="pr-label">Player Info</div><div class="pr-val"></div></div>';
    for (const f of metaFields)
      html += '<div class="preview-row"><div class="pr-label">' + (LABELS[f]||f) + '</div><div class="pr-val">' + esc(meta[f]) + '</div></div>';
  }
  const classFields = CLASS_ORDER.filter(f => stats[f] !== undefined);
  if (classFields.length) {
    html += '<div class="preview-row section-head"><div class="pr-label">Classic Stats</div><div class="pr-val"></div></div>';
    for (const f of classFields)
      html += '<div class="preview-row"><div class="pr-label">' + (LABELS[f]||f) + '</div><div class="pr-val">' + stats[f] + '</div></div>';
  }
  const statFields = STAT_ORDER.filter(f => stats[f] !== undefined);
  if (statFields.length) {
    html += '<div class="preview-row section-head"><div class="pr-label">HLTV 3.0 Stats</div><div class="pr-val"></div></div>';
    for (const f of statFields)
      html += '<div class="preview-row"><div class="pr-label">' + (LABELS[f]||f) + '</div><div class="pr-val">' + stats[f] + '</div></div>';
  }
  const attrFields = ATTR_ORDER.filter(f => stats[f] !== undefined);
  if (attrFields.length) {
    html += '<div class="preview-row section-head"><div class="pr-label">Role Attributes</div><div class="pr-val" style="color:#475569;font-size:0.7rem">x / 100 (combined)</div></div>';
    for (const f of attrFields)
      html += '<div class="preview-row"><div class="pr-label">' + (LABELS[f]||f) + '</div><div class="pr-val">' + stats[f] + '</div></div>';
  }
  if (!html) html = '<div class="preview-row"><div class="pr-label" style="color:#ef4444">No data found</div><div class="pr-val"></div></div>';

  document.getElementById('import-preview-box').innerHTML = html;
  const applyBtn = document.getElementById('import-apply-btn');
  applyBtn.disabled = fieldCount === 0;
  applyBtn.style.display = fieldCount > 0 ? 'inline-block' : 'none';
  document.getElementById('import-preview').style.display = 'block';

  document.getElementById('import-major').value = '';
  document.getElementById('import-team').innerHTML = '<option value="">— select team —</option>';
  document.getElementById('import-player').innerHTML = '<option value="">— select player —</option>';
}

async function applyImport() {
  if (!importParsed) return;
  const { playerId, playerName, org, major, stats, meta } = importParsed;
  if (!Object.keys(stats).length && !Object.keys(meta).length) { alert('Nothing to apply.'); return; }

  const status = document.getElementById('status');
  try {
    const res = await fetch('/api/apply-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org, major, players: [{ id: playerId, stats, meta }] }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { updated } = await res.json();
    allData = await (await fetch('/api/data')).json();
    renderSidebar(allData.teamMajors, document.getElementById('search').value);
    status.textContent = 'Imported stats for ' + playerName + ' ✓';
    status.className = 'status saved';
    const key = org + '|||' + major;
    if (currentKey === key) selectTeam(key);
    document.getElementById('import-paste').value = '';
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('import-apply-btn').style.display = 'none';
    importParsed = null;
  } catch (e) {
    status.textContent = 'Import error: ' + e.message;
    status.className = 'status error';
  }
  setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
}

function copyCmd(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  });
}

async function init() {
  const [dataRes, hsRes] = await Promise.all([fetch('/api/data'), fetch('/api/headshots')]);
  allData = await dataRes.json();
  headshots = await hsRes.json();
  renderSidebar(allData.teamMajors);
}

function teamStatus(team) {
  if (!team.players.length) return 'done';
  const isAdv = CS2_ADVANCED_MAJORS.has(team.major);
  const filled = team.players.filter(p => {
    const classic = p.rating !== 0 || p.kd !== 0 || p.adr !== 0;
    if (!isAdv) return classic;
    return classic && ((p.rating3 ?? 0) !== 0 || (p.kast ?? 0) !== 0);
  }).length;
  if (filled === 0) return 'empty';
  if (filled < team.players.length) return 'partial';
  return 'done';
}

function groupByMajor(entries) {
  const groups = {};
  for (const e of entries) {
    if (!groups[e.major]) groups[e.major] = [];
    groups[e.major].push(e);
  }
  return groups;
}

function renderSidebar(entries, filter = '') {
  const lf = filter.toLowerCase();
  const filtered = filter
    ? entries.filter(e => e.org.toLowerCase().includes(lf) || e.major.toLowerCase().includes(lf))
    : entries;
  const groups = groupByMajor(filtered);
  const el = document.getElementById('team-list');
  el.innerHTML = '';
  for (const [major, teams] of Object.entries(groups)) {
    const g = document.createElement('div');
    g.className = 'major-group';
    const label = document.createElement('div');
    label.className = 'major-label';
    label.textContent = major;
    g.appendChild(label);
    for (const team of teams) {
      const key = team.org + '|||' + team.major;
      const status = teamStatus(team);
      const btn = document.createElement('button');
      btn.className = 'team-btn' + (key === currentKey ? ' active' : '');
      btn.dataset.key = key;
      const dot = document.createElement('span');
      dot.className = 'dot dot-' + status;
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(team.org));
      btn.onclick = () => selectTeam(key);
      g.appendChild(btn);
    }
    el.appendChild(g);
  }
}

function filterTeams(val) {
  renderSidebar(allData.teamMajors, val);
}

function selectTeam(key) {
  currentKey = key;
  const [org, major] = key.split('|||');
  const team = allData.teamMajors.find(t => t.org === org && t.major === major);
  renderTeam(team);
  document.querySelectorAll('.team-btn').forEach(b => b.classList.toggle('active', b.dataset.key === key));
}

function cs2StatSection(player) {
  const f = (label, cls, val) => {
    const v = val ?? 0;
    return '<div class="stat-field"><label>' + label + '</label>' +
      '<input type="number" step="0.01" class="stat-input ' + cls + (v !== 0 ? ' filled' : '') + '" value="' + (v || '') + '"></div>';
  };
  const a = (label, cls, val) => {
    const v = val ?? 0;
    return '<div class="attr-field"><label>' + label + '</label>' +
      '<input type="number" step="1" min="0" max="100" class="stat-input ' + cls + (v !== 0 ? ' filled' : '') + '" value="' + (v || '') + '"></div>';
  };
  let s = '<div class="section-divider">';
  s += '<div class="section-label">HLTV 3.0 Stats</div>';
  s += '<div class="stats-grid-6">';
  s += f('Rating 3.0', 'rating3', player.rating3);
  s += f('KAST %', 'kast', player.kast);
  s += f('KPR', 'kpr', player.kpr);
  s += f('DPR', 'dpr', player.dpr);
  s += f('Multi-Kill', 'multiKill', player.multiKill);
  s += f('Round Swing %', 'roundSwingPct', player.roundSwingPct);
  s += '</div>';
  s += '<div class="section-label" style="margin-top:10px">Role Attributes ' +
    '<span style="font-size:0.6rem;font-weight:400;color:#475569;text-transform:none;letter-spacing:0">x / 100</span></div>';
  s += '<div class="breakdown-grid">';
  s += a('Firepower', 'firepower', player.firepower);
  s += a('Entrying', 'entrying', player.entrying);
  s += a('Trading', 'trading', player.trading);
  s += a('Opening', 'opening', player.opening);
  s += a('Clutching', 'clutching', player.clutching);
  s += a('Sniping', 'sniping', player.sniping);
  s += a('Utility', 'utility', player.utility);
  s += '</div></div>';
  return s;
}

function renderTeam(team) {
  const main = document.getElementById('main');
  const isAdvanced = CS2_ADVANCED_MAJORS.has(team.major);
  const regions = ['', 'EU', 'NA', 'CIS', 'APAC', 'SA', 'MENA'];
  const placements = ['', '1st', '2nd', '3rd-4th', '5th-8th', '9th-12th', '13th-16th', '9th-11th', '12th-14th', '15th-16th', '17th-19th', '20th-22nd', '23rd-24th', '25th-27th', '28th-30th', '31st-32nd'];

  let html = '<h2>' + esc(team.org) + '</h2><div class="major-tag">' + esc(team.major) +
    (isAdvanced ? ' &nbsp;<span style="background:#1e3a5f;border:1px solid #3b82f6;border-radius:3px;color:#93c5fd;font-size:0.65rem;padding:1px 7px;letter-spacing:0.05em;vertical-align:middle">HLTV 3.0</span>' : '') +
    '</div>';

  html += '<div class="team-meta">';
  html += '<div class="meta-field"><label>Region</label><select id="meta-region">' +
    regions.map(r => '<option value="' + r + '"' + (team.region === r ? ' selected' : '') + '>' + (r || '—') + '</option>').join('') + '</select></div>';
  html += '<div class="meta-field"><label>Placement</label><select id="meta-placement">' +
    placements.map(p => '<option value="' + p + '"' + (team.placement === p ? ' selected' : '') + '>' + (p || '—') + '</option>').join('') + '</select></div>';
  html += '<div class="meta-field"><label>Coach</label><input id="meta-coach" value="' + esc(team.coach || '') + '"></div>';
  html += '</div>';

  for (const player of team.players) {
    const filled = player.rating !== 0 || player.kd !== 0;
    html += '<div class="player-card" data-pid="' + esc(player.id) + '">';
    html += '<div class="player-top">';
    const hsPath = headshots[player.id] || '';
    html += '<div class="headshot-zone" id="hs-' + esc(player.id) + '" ondragover="hsDragOver(event,this)" ondragleave="hsDragLeave(this)" ondrop="hsDrop(event,\'' + esc(player.id) + '\')" onclick="this.querySelector(\'input\').click()">';
    html += '<img id="hs-img-' + esc(player.id) + '" src="' + esc(hsPath) + '" style="display:' + (hsPath ? 'block' : 'none') + '">';
    html += '<span class="hs-placeholder" id="hs-ph-' + esc(player.id) + '" style="display:' + (hsPath ? 'none' : 'block') + '">Drop photo</span>';
    html += '<input type="file" accept="image/*" onchange="hsFileInput(event,\'' + esc(player.id) + '\')">';
    html += '</div>';
    html += '<div style="flex:1"><div class="player-name">' + esc(player.name) + '</div>';
    html += '<div class="real-name-row"><label>Real Name</label><input class="real-name-input" value="' + esc(player.realName || '') + '"></div></div>';
    html += '</div>';
    html += '<div class="stats-grid">';
    html += statField('Rating', 'rating', player.rating, filled);
    html += statField('K/D', 'kd', player.kd, filled);
    html += statField('ADR', 'adr', player.adr, filled);
    html += statField('Impact', 'impact', player.impact, filled);
    html += '</div>';
    html += rolesField(player.roles || []);
    if (isAdvanced) html += cs2StatSection(player);
    html += '</div>';
  }

  html += '<button class="save-btn" onclick="saveTeam()">Save Team</button>';
  main.innerHTML = html;
  main.scrollTop = 0;
}

const ROLES = [
  { id: 'awp',     label: 'AWPer' },
  { id: 'entry',   label: 'Entry' },
  { id: 'support', label: 'Support' },
  { id: 'lurker',  label: 'Lurker' },
  { id: 'igl',     label: 'IGL' },
];

function rolesField(selected) {
  const btns = ROLES.map(r =>
    '<button type="button" class="role-btn' + (selected.includes(r.id) ? ' on' : '') +
    '" data-role="' + r.id + '" onclick="this.classList.toggle(\'on\')">' + r.label + '</button>'
  ).join('');
  return '<div class="roles-row"><label>Roles</label><div class="roles-toggles">' + btns + '</div></div>';
}

function statField(label, cls, val, filled) {
  return '<div class="stat-field"><label>' + label + '</label>' +
    '<input type="number" step="0.01" class="stat-input ' + cls + (filled && val !== 0 ? ' filled' : '') + '" value="' + (val || '') + '"></div>';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function saveTeam() {
  const [org, major] = currentKey.split('|||');
  const team = allData.teamMajors.find(t => t.org === org && t.major === major);

  team.region    = document.getElementById('meta-region').value;
  team.placement = document.getElementById('meta-placement').value;
  team.coach     = document.getElementById('meta-coach').value.trim() || undefined;

  const isAdvanced = CS2_ADVANCED_MAJORS.has(team.major);
  const cards = document.querySelectorAll('.player-card');
  cards.forEach((card, i) => {
    const p = team.players[i];
    if (!p) return;
    p.realName = card.querySelector('.real-name-input').value.trim();
    p.rating   = parseFloat(card.querySelector('.stat-input.rating').value) || 0;
    p.kd       = parseFloat(card.querySelector('.stat-input.kd').value) || 0;
    p.adr      = parseFloat(card.querySelector('.stat-input.adr').value) || 0;
    p.impact   = parseFloat(card.querySelector('.stat-input.impact').value) || 0;
    p.roles    = [...card.querySelectorAll('.role-btn.on')].map(b => b.dataset.role);
    if (isAdvanced) {
      const n = (sel) => parseFloat(card.querySelector(sel)?.value) || 0;
      const ni = (sel) => parseInt(card.querySelector(sel)?.value) || 0;
      p.rating3       = n('.stat-input.rating3');
      p.kast          = n('.stat-input.kast');
      p.kpr           = n('.stat-input.kpr');
      p.dpr           = n('.stat-input.dpr');
      p.multiKill     = n('.stat-input.multiKill');
      p.roundSwingPct = n('.stat-input.roundSwingPct');
      p.firepower  = ni('.stat-input.firepower');
      p.entrying   = ni('.stat-input.entrying');
      p.trading    = ni('.stat-input.trading');
      p.opening    = ni('.stat-input.opening');
      p.clutching  = ni('.stat-input.clutching');
      p.sniping    = ni('.stat-input.sniping');
      p.utility    = ni('.stat-input.utility');
    }
  });

  const status = document.getElementById('status');
  try {
    const res = await fetch('/api/save', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(allData) });
    if (!res.ok) throw new Error(await res.text());
    status.textContent = 'Saved ✓';
    status.className = 'status saved';
    renderSidebar(allData.teamMajors, document.getElementById('search').value);
    document.querySelectorAll('.team-btn').forEach(b => b.classList.toggle('active', b.dataset.key === currentKey));
  } catch (e) {
    status.textContent = 'Error: ' + e.message;
    status.className = 'status error';
  }
  setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
}

function hsDragOver(e, el) { e.preventDefault(); el.classList.add('drag-over'); }
function hsDragLeave(el) { el.classList.remove('drag-over'); }
function hsDrop(e, playerId) {
  e.preventDefault();
  const zone = document.getElementById('hs-' + playerId);
  zone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) uploadHeadshot(playerId, file);
}
function hsFileInput(e, playerId) {
  const file = e.target.files[0];
  if (file) uploadHeadshot(playerId, file);
}
function uploadHeadshot(playerId, file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    const status = document.getElementById('status');
    try {
      const res = await fetch('/api/headshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, dataUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { path } = await res.json();
      // Refresh full headshots map so propagated entries are visible immediately
      headshots = await (await fetch('/api/headshots')).json();
      const img = document.getElementById('hs-img-' + playerId);
      const ph = document.getElementById('hs-ph-' + playerId);
      img.src = path + '?t=' + Date.now();
      img.style.display = 'block';
      ph.style.display = 'none';
      status.textContent = 'Headshot saved ✓';
      status.className = 'status saved';
    } catch (err) {
      status.textContent = 'Upload error: ' + err.message;
      status.className = 'status error';
    }
    setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
  };
  reader.readAsDataURL(file);
}

init();
</script>
</body>
</html>`;

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  if (req.method === "GET" && req.url === "/api/data") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(readFileSync(teamsPath, "utf8"));
    return;
  }

  if (req.method === "GET" && req.url === "/api/headshots") {
    const manifestPath = join(__dirname, "../src/data/headshots.json");
    if (existsSync(manifestPath)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(readFileSync(manifestPath, "utf8"));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    }
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/headshots/")) {
    const filename = req.url.slice("/headshots/".length).replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = join(headshotsDir, filename);
    if (!existsSync(filePath)) { res.writeHead(404); res.end("Not found"); return; }
    const ext = extname(filename).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    res.writeHead(200, { "Content-Type": mime });
    res.end(readFileSync(filePath));
    return;
  }

  if (req.method === "POST" && req.url === "/api/headshot") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { playerId, dataUrl } = JSON.parse(body);
        if (!playerId || !dataUrl) throw new Error("Missing playerId or dataUrl");
        const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        if (!match) throw new Error("Invalid image data");
        const ext = match[1] === "png" ? ".png" : match[1] === "webp" ? ".webp" : ".jpg";
        const buf = Buffer.from(match[2], "base64");
        writeFileSync(join(headshotsDir, playerId + ext), buf);

        // Update headshots.json manifest and propagate to same gamertag/year entries
        const manifestPath = join(__dirname, "../src/data/headshots.json");
        const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
        const newPath = `/headshots/${playerId}${ext}`;
        manifest[playerId] = newPath;

        // Propagate: find all player IDs with the same gamertag in the same year
        // (and 2013 uploads also cover 2014)
        try {
          const { teamMajors } = JSON.parse(readFileSync(teamsPath, "utf8"));
          // Find which team this player belongs to so we can extract the gamertag cleanly
          let gamertag = null;
          let uploadYear = null;
          for (const team of teamMajors) {
            const match = team.players.find(p => p.id === playerId);
            if (match) {
              gamertag = playerId.slice(0, playerId.length - team.id.length - 1);
              const ym = team.id.match(/(\d{4})[^_]*$/);
              if (ym) uploadYear = ym[1];
              break;
            }
          }
          if (gamertag && uploadYear) {
            for (const team of teamMajors) {
              const ym = team.id.match(/(\d{4})[^_]*$/);
              if (!ym) continue;
              const teamYear = ym[1];
              const sameYear = teamYear === uploadYear;
              const is2014fallback = uploadYear === "2013" && teamYear === "2014";
              if (!sameYear && !is2014fallback) continue;
              for (const player of team.players) {
                const pg = player.id.slice(0, player.id.length - team.id.length - 1);
                if (pg !== gamertag) continue;
                if (player.id === playerId) continue;
                // Only set if no exact file exists on disk for this ID
                const hasExact = [".jpg", ".jpeg", ".png", ".webp"].some(e =>
                  existsSync(join(headshotsDir, player.id + e))
                );
                if (!hasExact) manifest[player.id] = newPath;
              }
            }
          }
        } catch { /* teams.json unreadable — skip propagation */ }

        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, path: `/headshots/${playerId}${ext}` }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(e.message);
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/apply-import") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { org, major, players } = JSON.parse(body);
        const data = load();
        const team = data.teamMajors.find(t => t.org === org && t.major === major);
        if (!team) throw new Error(`Team not found: ${org} @ ${major}`);

        let updated = 0;
        for (const { id, stats, meta } of players) {
          const player = team.players.find(p => p.id === id);
          if (!player) continue;
          for (const [field, val] of Object.entries(stats || {})) {
            const cur = player[field];
            if (cur === undefined || cur === null || cur === 0 || cur === '') {
              player[field] = val;
            }
          }
          if (meta?.realName && !player.realName) player.realName = meta.realName;
          updated++;
        }

        save(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, updated }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(e.message);
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/save") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        save(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(e.message);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Stats editor running at http://localhost:${PORT}`);
  console.log(`Editing: ${teamsPath}`);
  console.log(`Press Ctrl+C to stop.`);
});
