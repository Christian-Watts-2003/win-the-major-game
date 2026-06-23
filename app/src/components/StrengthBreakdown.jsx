import { getRoleById } from "../lib/draftData";
import { statTier, tierTextClass } from "../lib/statTiers";

const HLTV3_SLOT_LABELS = {
  awp:     "AWPer",
  entry:   "Entry",
  support: "Support",
  star:    "Star",
  igl:     "IGL",
};

export default function StrengthBreakdown({ lineup, breakdown, statsRevealed, gameMode = "classic" }) {
  const isHltv3 = gameMode === "hltv3";
  const accent = isHltv3 ? "text-broadcast-green" : "text-broadcast-orange";

  return (
    <div className={`rounded-sm border bg-broadcast-panel ${isHltv3 ? "border-broadcast-green/40" : "border-broadcast-line"}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-broadcast-line px-6 py-5 sm:px-10">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-broadcast-muted">
            Final lineup
          </div>
          <h2 className="font-display text-3xl font-black uppercase tracking-tight">
            Strength rating: <span className={accent}>{breakdown.finalStrength}</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-broadcast-line sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {lineup.map((slot) => (
          <LineupCard key={slot.roleId} slot={slot} statsRevealed={statsRevealed} isHltv3={isHltv3} />
        ))}
      </div>

      <div className="border-t border-broadcast-line px-6 py-5 sm:px-10">
        <div className="mb-3 font-mono text-xs uppercase tracking-widest text-broadcast-muted">
          How this was calculated
        </div>
        {isHltv3 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatTile label="Team avg RTG 3.0" value={breakdown.teamAvgRating.toFixed(2)} statKey="rating3" raw={breakdown.teamAvgRating} />
              <StatTile label="Team avg KAST"    value={breakdown.teamAvgKast != null ? `${breakdown.teamAvgKast.toFixed(1)}%` : "—"} statKey="kast" raw={breakdown.teamAvgKast} />
              <StatTile label="Team avg KPR"     value={breakdown.teamAvgKd.toFixed(2)} statKey="kpr" raw={breakdown.teamAvgKd} />
              <StatTile label="Team avg DPR"     value={breakdown.teamAvgAdr.toFixed(2)} statKey="dpr" raw={breakdown.teamAvgAdr} />
              <StatTile label="Team avg MK %"    value={breakdown.teamAvgMultiKill != null ? `${breakdown.teamAvgMultiKill.toFixed(1)}%` : "—"} statKey="multiKill" raw={breakdown.teamAvgMultiKill} />
              <StatTile label="Team avg RSW %"   value={breakdown.teamAvgRsw != null ? `${breakdown.teamAvgRsw.toFixed(1)}%` : "—"} statKey="roundSwingPct" raw={breakdown.teamAvgRsw} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <MultiplierTile
                label="Attribute efficiency"
                value={breakdown.avgEffectiveScore.toFixed(1)}
                note="weighted by role demands"
                positive={breakdown.avgEffectiveScore >= 100}
              />
              <MultiplierTile
                label="Star boost"
                value={`×${breakdown.starBoost?.toFixed(2) ?? "1.05"}`}
                note="star player weighted 5% higher"
                positive={true}
              />
              <MultiplierTile
                label="Chemistry"
                value={`×${breakdown.chemistryFactor.toFixed(3)}`}
                note={breakdown.chemistryRaw === 0 ? "no shared major history" : `${breakdown.chemistryRaw} shared roster appearances`}
                positive={breakdown.chemistryRaw > 0}
              />
              <MultiplierTile
                label="IGL CS2 bonus"
                value={`×${breakdown.iglFactor.toFixed(3)}`}
                note={breakdown.iglCs2Majors > 0 ? `${breakdown.iglCs2Majors} CS2 major${breakdown.iglCs2Majors === 1 ? "" : "s"}` : "IGL has no CS2 majors"}
                positive={breakdown.iglCs2Majors > 0}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <StatTile label="Team avg Rating" value={breakdown.teamAvgRating.toFixed(2)} />
              <StatTile label="Team avg K/D" value={breakdown.teamAvgKd.toFixed(2)} />
              <StatTile label="Team avg ADR" value={breakdown.teamAvgAdr.toFixed(1)} />
              <StatTile label="Team avg Impact" value={breakdown.teamAvgImpact.toFixed(2)} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <MultiplierTile
                label="Role fit"
                value={breakdown.avgEffectiveScore.toFixed(1)}
                note={`${5 - breakdown.offRoleCount}/5 in natural role`}
                positive={breakdown.offRoleCount === 0}
              />
              <MultiplierTile
                label="Chemistry"
                value={`×${breakdown.chemistryFactor.toFixed(3)}`}
                note={breakdown.chemistryRaw === 0 ? "no shared major history" : `${breakdown.chemistryRaw} shared roster appearances`}
                positive={breakdown.chemistryRaw > 0}
              />
              <MultiplierTile
                label="IGL coverage"
                value={`×${breakdown.iglFactor.toFixed(2)}`}
                note={breakdown.hasNaturalIGL ? `${breakdown.iglMajors} major${breakdown.iglMajors === 1 ? "" : "s"} as IGL` : "no natural IGL"}
                positive={breakdown.hasNaturalIGL}
              />
              <MultiplierTile
                label="AWP coverage"
                value={`×${breakdown.awpFactor.toFixed(2)}`}
                note={breakdown.hasNaturalAwp ? "real AWPer in AWP slot" : "no natural AWPer"}
                positive={breakdown.hasNaturalAwp}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LineupCard({ slot, statsRevealed, isHltv3 }) {
  const role = isHltv3 ? null : getRoleById(slot.roleId);
  const roleLabel = isHltv3 ? (HLTV3_SLOT_LABELS[slot.roleId] ?? slot.roleId) : role?.label;
  const naturalFit = !isHltv3 && slot.player.roles.includes(slot.roleId);

  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <div className={`font-mono text-[10px] uppercase tracking-widest ${isHltv3 ? "text-broadcast-green" : "text-broadcast-orange"}`}>
        {roleLabel}
      </div>
      <div className="font-display text-xl font-bold uppercase leading-tight">{slot.player.name}</div>
      <div className="text-xs text-broadcast-muted-2">{slot.player.realName}</div>
      {!isHltv3 && (
        <div className="mt-1">
          <span
            className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
              naturalFit ? "bg-broadcast-green/15 text-broadcast-green" : "bg-broadcast-red/15 text-broadcast-red"
            }`}
          >
            {naturalFit ? "In-role" : "Off-role"}
          </span>
        </div>
      )}
      {statsRevealed && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {isHltv3 ? (
            <>
              <MiniStat label="RTG 3.0" value={slot.player.rating3} statKey="rating3" />
              <MiniStat label="KAST"    value={slot.player.kast}    statKey="kast"    suffix="%" />
              <MiniStat label="KPR"     value={slot.player.kpr}     statKey="kpr" />
              <MiniStat label="DPR"     value={slot.player.dpr}     statKey="dpr" />
              <MiniStat label="MK %"    value={slot.player.multiKill}    statKey="multiKill"    suffix="%" />
              <MiniStat label="RSW %"   value={slot.player.roundSwingPct} statKey="roundSwingPct" suffix="%" />
            </>
          ) : (
            <>
              <MiniStat label="RTG" value={slot.player.rating} />
              <MiniStat label="K/D" value={slot.player.kd} />
              <MiniStat label="ADR" value={slot.player.adr} decimals={1} />
              <MiniStat label="IMP" value={slot.player.impact} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, statKey, raw }) {
  const tier = statKey ? statTier(statKey, raw) : null;
  return (
    <div className="rounded-sm border border-broadcast-line bg-broadcast-panel-raised px-4 py-3">
      <div className={`font-mono text-base font-semibold ${tierTextClass(tier)}`}>{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, decimals = 2, suffix = "", statKey }) {
  const tier = statKey ? statTier(statKey, value) : null;
  return (
    <div className="rounded-sm bg-broadcast-bg px-2 py-1">
      <div className="font-mono text-[9px] uppercase tracking-widest text-broadcast-muted">{label}</div>
      <div className={`font-mono text-xs font-semibold ${tier ? tierTextClass(tier) : "text-broadcast-text"}`}>
        {value && value !== 0 ? `${value.toFixed(decimals)}${suffix}` : "—"}
      </div>
    </div>
  );
}

function MultiplierTile({ label, value, note, positive }) {
  return (
    <div className="rounded-sm border border-broadcast-line bg-broadcast-panel-raised px-4 py-3">
      <div className={`font-mono text-base font-semibold ${positive ? "text-broadcast-green" : "text-broadcast-red"}`}>
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">{label}</div>
      <div className="mt-1 text-[11px] text-broadcast-muted-2">{note}</div>
    </div>
  );
}
