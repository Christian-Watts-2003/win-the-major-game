import { ATTRIBUTE_DEFS, ROLE_KEY_ATTRIBUTES } from "../lib/attributeIcons";
import { tierBgClass, tierTextClass } from "../lib/statTiers";
import { getRoleById } from "../lib/draftData";

const HLTV3_SLOT_LABELS = {
  awp:     "AWPer",
  entry:   "Entry",
  support: "Support",
  star:    "Star",
  lurker:  "Lurker",
};

const ALL_ATTRS = ["clutching", "entrying", "firepower", "opening", "sniping", "trading", "utility"];

function attrTier(score) {
  if (score === null || score === undefined) return null;
  if (score >= 80) return "blue";
  if (score >= 60) return "green";
  if (score >= 35) return "yellow";
  return "red";
}

function topAttrs(player, n = 3) {
  return ALL_ATTRS
    .filter((a) => (player[a] ?? 0) > 0)
    .sort((a, b) => (player[b] ?? 0) - (player[a] ?? 0))
    .slice(0, n);
}

export default function RolePerformanceBreakdown({ lineup, gameMode = "classic", iglPlayerId = null }) {
  const isHltv3 = gameMode === "hltv3";

  return (
    <div className={`rounded-sm border bg-broadcast-panel ${isHltv3 ? "border-broadcast-green/40" : "border-broadcast-line"}`}>
      <div className="border-b border-broadcast-line px-6 py-4 sm:px-10">
        <div className="font-mono text-xs uppercase tracking-widest text-broadcast-muted">
          Role performance
        </div>
        <h3 className="font-display text-xl font-black uppercase tracking-tight">
          Player — Role Fit Breakdown
        </h3>
      </div>

      <div className="divide-y divide-broadcast-line">
        {lineup.map(({ roleId, player }) => (
          <RoleRow
            key={roleId}
            roleId={roleId}
            player={player}
            isHltv3={isHltv3}
            isIgl={isHltv3 && iglPlayerId && player && iglPlayerId === player.id}
          />
        ))}
      </div>
    </div>
  );
}

function RoleRow({ roleId, player, isHltv3, isIgl }) {
  const accent = isHltv3 ? "text-broadcast-green" : "text-broadcast-orange";
  const roleLabel = isHltv3 ? (HLTV3_SLOT_LABELS[roleId] ?? roleId) : (getRoleById(roleId)?.label ?? roleId);

  const keyAttrKeys = isHltv3
    ? (roleId === "star" && player
        ? topAttrs(player, 3)
        : roleId === "awp" && player
          ? ["sniping", ...topAttrs(player, 4).filter((a) => a !== "sniping").slice(0, 2)]
          : (ROLE_KEY_ATTRIBUTES[roleId] ?? []))
    : [];

  const naturalFit = !isHltv3 && player ? player.roles.includes(roleId) : null;

  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:px-10">
      {/* Left: role + player identity */}
      <div className="w-full sm:w-52 shrink-0">
        <div className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${accent}`}>
          {roleLabel}
          {roleId === "star" && <span className="text-yellow-400">★</span>}
          {isIgl && (
            <span className="rounded-sm bg-broadcast-green/20 px-1 py-0.5 text-[8px] text-broadcast-green">
              IGL
            </span>
          )}
        </div>

        {player ? (
          <>
            <div className="mt-1 font-display text-lg font-bold uppercase leading-tight">
              {player.name}
            </div>
            <div className="text-[11px] text-broadcast-muted-2">{player.realName}</div>

            {!isHltv3 && (
              <div className="mt-2">
                <span
                  className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                    naturalFit
                      ? "bg-broadcast-green/15 text-broadcast-green"
                      : "bg-broadcast-red/15 text-broadcast-red"
                  }`}
                >
                  {naturalFit ? "In-role" : "Off-role"}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="mt-1 font-mono text-xs text-broadcast-muted">Empty slot</div>
        )}
      </div>

      {/* Right: attribute bars (HLTV3) or stat grid (classic) */}
      {player && (
        isHltv3 ? (
          <div className="flex-1">
            <AttrBars player={player} attrKeys={keyAttrKeys} />
          </div>
        ) : (
          <div className="flex-1">
            <ClassicStatGrid player={player} />
          </div>
        )
      )}
    </div>
  );
}

function AttrBars({ player, attrKeys }) {
  return (
    <div className="flex flex-col gap-2.5">
      {attrKeys.map((attrKey) => {
        const def = ATTRIBUTE_DEFS.find((d) => d.key === attrKey);
        if (!def) return null;
        const score = player[attrKey] ?? null;
        const tier = attrTier(score);
        const pct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
        const barColor = score === null ? "bg-broadcast-muted/20" : tierBgClass(tier);
        const textColor = score === null ? "text-broadcast-muted" : tierTextClass(tier);

        return (
          <div key={attrKey} className="flex items-center gap-3">
            <def.Icon className="h-3.5 w-3.5 shrink-0 text-broadcast-muted/60" />
            <div className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wide text-broadcast-muted">
              {def.name}
            </div>
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-broadcast-bg">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${score !== null ? pct : 0}%` }}
              />
            </div>
            <div className={`w-7 text-right font-mono text-[11px] font-semibold ${textColor}`}>
              {score !== null ? score : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClassicStatGrid({ player }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <ClassicStat label="Rating" value={player.rating !== 0 ? player.rating?.toFixed(2) : "—"} />
      <ClassicStat label="K/D"    value={player.kd?.toFixed(2)} />
      <ClassicStat label="ADR"    value={player.adr?.toFixed(1)} />
      <ClassicStat label="Impact" value={player.impact?.toFixed(2)} />
    </div>
  );
}

function ClassicStat({ label, value }) {
  return (
    <div className="rounded-sm bg-broadcast-bg px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-broadcast-muted">{label}</div>
      <div className="font-mono text-sm font-semibold text-broadcast-text">{value ?? "—"}</div>
    </div>
  );
}
