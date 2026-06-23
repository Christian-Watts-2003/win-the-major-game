import rawData from "../data/teams.json";
import { CS2_MAJORS } from "../config";

export const ROLES = rawData.roles;
export const TEAM_MAJORS = rawData.teamMajors;
export const MAJORS = rawData._meta.majors;

export function getRoleById(roleId) {
  return ROLES.find((r) => r.id === roleId);
}

export function getAllOrgs() {
  return [...new Set(TEAM_MAJORS.map((t) => t.org))];
}

export function findTeamMajor(org, major) {
  return TEAM_MAJORS.find((t) => t.org === org && t.major === major);
}

// Spin only among combos that actually resolve to a real team-era —
// A team is considered "ready" if it has at least one player with stats filled in.
function hasStats(t) {
  return t.players.some((p) => p.rating !== 0 || p.kd !== 0);
}

// A team is eligible for HLTV 3.0 mode only if every player has kast filled in
// (kast is exclusive to the HLTV 3.0 schema and is never copied from classic stats).
function hasRating3(t) {
  return t.players.length > 0 && t.players.every((p) => p.kast && p.kast !== 0);
}

// this is what the game uses by default so every spin is "live."
export function spinValidTeamMajor(rng = Math.random, excludeIds = []) {
  const pool = TEAM_MAJORS.filter((t) => hasStats(t) && !excludeIds.includes(t.id));
  if (pool.length === 0) return null;
  const idx = Math.floor(rng() * pool.length);
  return pool[idx];
}

// Spin only from CS2-era majors (HLTV 3.0 mode).
export function spinValidCS2TeamMajor(rng = Math.random, excludeIds = []) {
  const pool = TEAM_MAJORS.filter((t) => hasStats(t) && hasRating3(t) && CS2_MAJORS.includes(t.major) && !excludeIds.includes(t.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

// Keep the major, reroll the team — picks a different org at the same major.
export function spinTeamKeepMajor(major, excludeIds = [], rng = Math.random, requireRating3 = false) {
  const pool = TEAM_MAJORS.filter((t) =>
    hasStats(t) && t.major === major && !excludeIds.includes(t.id) &&
    (!requireRating3 || hasRating3(t))
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

// Keep the org, reroll the major — picks a different major the same org appeared at.
export function spinMajorKeepTeam(org, excludeIds = [], rng = Math.random, requireRating3 = false) {
  const pool = TEAM_MAJORS.filter((t) =>
    hasStats(t) && t.org === org && !excludeIds.includes(t.id) &&
    (!requireRating3 || hasRating3(t))
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

