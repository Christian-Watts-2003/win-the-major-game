import { useDraggable } from "@dnd-kit/core";
import { MAX_REROLLS_TEAM, MAX_REROLLS_MAJOR } from "../config";
import headshotMap from "../data/headshots.json";
import { ATTRIBUTE_DEFS } from "../lib/attributeIcons";
import { CS2_IGL_MAJORS_MAP } from "../lib/simulation";
import { statTier, tierTextClass, tierBgClass } from "../lib/statTiers";

export default function DraftScreen({ teamMajor, pickNumber, totalPicks, onPick, usedPlayerIds, statsRevealed, teamRerollsUsed, majorRerollsUsed, onRerollTeam, onRerollMajor, gameMode = "classic" }) {
  const usedGamertags = new Set(usedPlayerIds.map((id) => id.split("_")[0]));
  const eligiblePlayers = teamMajor.players.filter((p) => !usedGamertags.has(p.id.split("_")[0]));

  return (
    <div className="rounded-sm border border-broadcast-line bg-broadcast-panel">
      <div className="border-b border-broadcast-line px-6 py-4 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className={`flex items-center gap-2 font-mono text-xs uppercase tracking-widest ${gameMode === "hltv3" ? "text-broadcast-green" : "text-broadcast-orange"}`}>
              Roster locked — pick {pickNumber} of {totalPicks}
              {gameMode === "hltv3" && (
                <span className="rounded-sm border border-broadcast-green/40 bg-broadcast-green/10 px-1.5 py-0.5 text-[9px]">
                  HLTV 3.0
                </span>
              )}
            </div>
            <h2 className="font-display text-3xl font-black uppercase tracking-tight">
              {teamMajor.org} <span className="text-broadcast-muted-2">· {teamMajor.major}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-sm border border-broadcast-line px-2 py-1 font-mono text-xs uppercase text-broadcast-muted-2">
              {teamMajor.region}
            </div>
            <div className="rounded-sm border border-broadcast-orange/40 bg-broadcast-orange/10 px-2 py-1 font-mono text-xs uppercase text-broadcast-orange">
              {teamMajor.placement}
            </div>
            <button
              onClick={onRerollTeam}
              disabled={teamRerollsUsed >= MAX_REROLLS_TEAM}
              className="flex flex-col items-center rounded-sm border border-broadcast-line px-3 py-1.5 transition hover:border-broadcast-orange hover:text-broadcast-orange disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-broadcast-line disabled:hover:text-broadcast-muted-2"
            >
              <span className="font-display text-xs font-bold uppercase tracking-wide text-broadcast-muted-2">New team</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">
                {MAX_REROLLS_TEAM - teamRerollsUsed} left
              </span>
            </button>
            <button
              onClick={onRerollMajor}
              disabled={majorRerollsUsed >= MAX_REROLLS_MAJOR}
              className="flex flex-col items-center rounded-sm border border-broadcast-line px-3 py-1.5 transition hover:border-broadcast-orange hover:text-broadcast-orange disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-broadcast-line disabled:hover:text-broadcast-muted-2"
            >
              <span className="font-display text-xs font-bold uppercase tracking-wide text-broadcast-muted-2">New major</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">
                {MAX_REROLLS_MAJOR - majorRerollsUsed} left
              </span>
            </button>
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-broadcast-muted-2">{teamMajor.blurb}</p>
      </div>

      <div className="grid gap-3 p-4 sm:p-6">
        {eligiblePlayers.length === 0 && (
          <div className="rounded-sm border border-broadcast-red/40 bg-broadcast-red/5 px-4 py-6 text-center text-sm text-broadcast-muted-2">
            Every player on this roster is already in your lineup. Re-spin needed — go back and use your re-spin.
          </div>
        )}
        {eligiblePlayers.map((player) => (
          <PlayerCard key={player.id} player={player} headshot={headshotMap[player.id]} statsRevealed={statsRevealed} gameMode={gameMode} onPick={() => onPick(player)} />
        ))}
      </div>
      {gameMode === "hltv3" && <RoleLegend />}
    </div>
  );
}

function PlayerCard({ player, headshot, statsRevealed, gameMode = "classic", onPick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { type: "draft-pool", player },
  });
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  if (gameMode === "hltv3") {
    return <Hltv3PlayerCard player={player} headshot={headshot} statsRevealed={statsRevealed} onPick={onPick} dragRef={setNodeRef} dragListeners={listeners} dragAttributes={attributes} dragStyle={dragStyle} isDragging={isDragging} />;
  }

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={dragStyle}
      onClick={onPick}
      className={`group flex flex-col gap-4 rounded-sm border border-broadcast-line bg-broadcast-panel-raised p-4 text-left transition hover:border-broadcast-orange sm:flex-row sm:items-center sm:justify-between ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-broadcast-bg font-display text-xl font-black text-broadcast-muted-2 group-hover:text-broadcast-orange">
          {headshot
            ? <img src={headshot} alt={player.name} className="h-full w-full object-cover object-top" />
            : player.name.slice(0, 2).toUpperCase()
          }
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold uppercase tracking-tight">
              {player.name}
            </span>
          </div>
          <div className="text-xs text-broadcast-muted-2">{player.realName}</div>
          <div className="mt-1 flex gap-1.5">
            {player.roles.map((r) => (
              <span
                key={r}
                className="rounded-sm border border-broadcast-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-broadcast-muted"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      {statsRevealed ? (
        <div className="flex flex-col gap-2 border-t border-broadcast-line pt-3 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
          <div className="grid grid-cols-4 gap-4">
            <StatBlock label="RTG" value={player.rating !== 0 ? player.rating.toFixed(2) : "—"} />
            <StatBlock label="K/D" value={player.kd !== 0 ? player.kd.toFixed(2) : "—"} />
            <StatBlock label="ADR" value={player.adr !== 0 ? player.adr.toFixed(1) : "—"} />
            <StatBlock label="IMP" value={player.impact !== 0 ? player.impact.toFixed(2) : "—"} />
          </div>
        </div>
      ) : (
        <div className="border-t border-broadcast-line pt-3 text-right font-mono text-xs uppercase tracking-widest text-broadcast-muted sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
          Stats hidden
        </div>
      )}
    </button>
  );
}

function Hltv3PlayerCard({ player, headshot, statsRevealed, onPick, dragRef, dragListeners, dragAttributes, dragStyle, isDragging }) {
  return (
    <div
      className={`group flex w-full rounded-sm border border-broadcast-line bg-broadcast-panel-raised text-left transition hover:border-broadcast-green ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Left: photo — drag handle only, click still picks via onPick below */}
      <div
        ref={dragRef}
        {...dragListeners}
        {...dragAttributes}
        style={dragStyle}
        className="relative flex w-32 shrink-0 cursor-grab flex-col justify-end overflow-hidden bg-broadcast-bg active:cursor-grabbing sm:w-36"
        title="Drag to place"
      >
        {headshot ? (
          <img src={headshot} alt={player.name} className="absolute inset-0 h-full w-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-black text-broadcast-muted-2 group-hover:text-broadcast-green">
            {player.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {/* Drag hint — grip icon pulses until hovered */}
        <div className="absolute right-1.5 top-1.5 z-20 flex flex-col items-center gap-0.5">
          {/* 6-dot grip icon */}
          <div className="group-hover:animate-none animate-pulse rounded-sm bg-broadcast-bg/60 p-1 backdrop-blur-sm transition-all group-hover:bg-broadcast-green/20">
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" className="text-broadcast-muted group-hover:text-broadcast-green transition-colors">
              <circle cx="3" cy="2" r="1.5" />
              <circle cx="7" cy="2" r="1.5" />
              <circle cx="3" cy="7" r="1.5" />
              <circle cx="7" cy="7" r="1.5" />
              <circle cx="3" cy="12" r="1.5" />
              <circle cx="7" cy="12" r="1.5" />
            </svg>
          </div>
          <span className="rounded-sm bg-broadcast-bg/70 px-1 py-0.5 font-mono text-[7px] uppercase tracking-widest text-broadcast-muted opacity-0 transition-opacity group-hover:opacity-100">
            drag
          </span>
        </div>
        <div className="relative z-10 bg-gradient-to-t from-broadcast-bg via-broadcast-bg/80 to-transparent px-2 pb-2 pt-8">
          <div className="truncate font-display text-sm font-bold uppercase leading-tight text-broadcast-text">
            {player.name}
          </div>
          <div className="truncate font-mono text-[9px] text-broadcast-muted">
            {player.realName}
          </div>
          {player.roles?.includes("igl") && (() => {
            const majors = CS2_IGL_MAJORS_MAP.get(player.id.split("_")[0]) ?? 0;
            return (
              <div className="mt-1 inline-flex items-center gap-1 rounded-sm border border-broadcast-green/40 bg-broadcast-green/10 px-1.5 py-0.5">
                <span className="font-mono text-[8px] uppercase tracking-widest text-broadcast-green">IGL</span>
                {statsRevealed && majors > 0 && (
                  <span className="font-mono text-[8px] text-broadcast-green/70">· {majors}×</span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Middle + Right: clickable area for picking */}
      <button onClick={onPick} className="flex flex-1 items-stretch text-left">
        {/* Middle: HLTV 3.0 stats */}
        <div className="flex flex-1 flex-col justify-center border-l border-broadcast-line px-4 py-4">
          {statsRevealed ? (
            <div className="grid grid-cols-3 gap-x-5 gap-y-3">
              <Stat3 label="RTG 3.0" value={player.rating3 && player.rating3 !== 0 ? player.rating3.toFixed(2) : "—"} tier={statTier("rating3", player.rating3)} />
              <Stat3 label="KAST"    value={player.kast && player.kast !== 0 ? `${player.kast.toFixed(1)}%` : "—"} tier={statTier("kast", player.kast)} />
              <Stat3 label="KPR"     value={player.kpr && player.kpr !== 0 ? player.kpr.toFixed(2) : "—"} tier={statTier("kpr", player.kpr)} />
              <Stat3 label="DPR"     value={player.dpr && player.dpr !== 0 ? player.dpr.toFixed(2) : "—"} tier={statTier("dpr", player.dpr)} />
              <Stat3 label="MK %"    value={player.multiKill && player.multiKill !== 0 ? `${player.multiKill.toFixed(1)}%` : "—"} tier={statTier("multiKill", player.multiKill)} />
              <Stat3 label="RSW %"   value={player.roundSwingPct && player.roundSwingPct !== 0 ? `${player.roundSwingPct.toFixed(1)}%` : "—"} tier={statTier("roundSwingPct", player.roundSwingPct)} />
            </div>
          ) : (
            <div className="font-mono text-xs uppercase tracking-widest text-broadcast-muted">Stats hidden</div>
          )}
        </div>

        {/* Right: role attribute bars — overflow-visible so tooltip escapes upward */}
        <div className="flex shrink-0 items-center gap-3 overflow-visible border-l border-broadcast-line px-4 py-4">
          {ATTRIBUTE_DEFS.map(({ key, name, Icon }) => {
            const score = player[key] ?? null;
            const pct = score !== null ? Math.min(100, Math.max(0, score)) : 0;
            const barColor =
              pct >= 80 ? "bg-cyan-400" :
              pct >= 60 ? "bg-broadcast-green" :
              pct >= 35 ? "bg-broadcast-orange" :
              "bg-broadcast-red";

            return (
              <div key={key} className="group/attr relative flex flex-col items-center gap-1.5">
                {/* Hover tooltip — sits above the card */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-broadcast-line bg-broadcast-bg px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-broadcast-text opacity-0 transition-opacity group-hover/attr:opacity-100">
                  {name}
                </div>
                <Icon className="h-3.5 w-3.5 text-broadcast-muted transition-colors group-hover/attr:text-broadcast-text" />
                <div className="flex h-16 w-2 flex-col-reverse overflow-hidden rounded-full bg-broadcast-bg">
                  <div
                    className={`w-full rounded-full transition-all ${barColor}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <div className="font-mono text-[8px] uppercase tracking-wide text-broadcast-muted">
                  {score !== null ? score : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </button>
    </div>
  );
}

function Stat3({ label, value, tier }) {
  return (
    <div>
      <div className={`font-mono text-sm font-semibold ${tierTextClass(tier)}`}>
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-broadcast-muted">{label}</div>
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="text-center">
      <div className="font-mono text-base font-semibold text-broadcast-text">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">{label}</div>
    </div>
  );
}

const ROLE_LEGEND = [
  { role: "AWPer",   desc: "Primary sniper. Controls long angles and creates picks from distance.",              attrs: ["sniping"] },
  { role: "Entry",   desc: "First through the door. Opens sites and trades aggressively.",                       attrs: ["entrying", "opening", "trading"] },
  { role: "Support", desc: "Enables teammates with utility and trades fallen entry fraggers.",                   attrs: ["clutching", "trading", "utility"] },
  { role: "Star ★",  desc: "Versatile top-fragger. Weighted 5% higher than other roles.",                       attrs: [] },
  { role: "Lurker",  desc: "Creates off-angles and lone-wolf pressure. Opens duels from unexpected positions.",  attrs: ["clutching", "opening", "trading"] },
];

function RoleLegend() {
  return (
    <div className="border-t border-broadcast-line px-6 py-5 sm:px-10">
      <div className="mb-4 font-mono text-[9px] uppercase tracking-widest text-broadcast-muted">Role guide</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ROLE_LEGEND.map(({ role, desc, attrs }) => (
          <div key={role}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-green">{role}</div>
            <p className="mt-0.5 text-[11px] leading-snug text-broadcast-muted-2">{desc}</p>
            <div className="mt-1.5 flex flex-col gap-1">
              {attrs.map((attrKey) => {
                const def = ATTRIBUTE_DEFS.find((d) => d.key === attrKey);
                if (!def) return null;
                return (
                  <div key={attrKey} className="flex items-center gap-1">
                    <def.Icon className="h-2.5 w-2.5 text-broadcast-muted/60" />
                    <span className="font-mono text-[8px] uppercase tracking-wide text-broadcast-muted">{def.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
