import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ROLES, TEAM_MAJORS } from "../lib/draftData";
import { SLOT_ORDER_HLTV3 } from "../config";
import { ATTRIBUTE_DEFS, ROLE_KEY_ATTRIBUTES } from "../lib/attributeIcons";
import { tierBgClass } from "../lib/statTiers";

const SLOT_ORDER = ["awp", "entry", "support", "lurker", "igl"];

const ALL_ATTRS = ["clutching", "entrying", "firepower", "opening", "sniping", "trading", "utility"];

function topAttrs(player, n = 3) {
  return ALL_ATTRS
    .filter((a) => (player[a] ?? 0) > 0)
    .sort((a, b) => (player[b] ?? 0) - (player[a] ?? 0))
    .slice(0, n);
}

const HLTV3_SLOT_LABELS = {
  awp:    "AWPer",
  entry:  "Entry",
  support:"Support",
  star:   "Star",
  lurker: "Lurker",
};

export default function LiveRosterBoard({
  assignments,
  pendingPlayer,
  draftedPlayers,
  statsRevealed,
  pickNumber,
  totalPicks,
  gameMode = "classic",
  iglPlayerId,
}) {
  const originById = buildOriginMap(draftedPlayers);
  const activeSlotOrder = gameMode === "hltv3" ? SLOT_ORDER_HLTV3 : SLOT_ORDER;
  const isHltv3 = gameMode === "hltv3";

  return (
    <aside className="w-full shrink-0 lg:w-80">
      <div className={`rounded-sm border bg-broadcast-panel ${isHltv3 ? "border-broadcast-green/40" : "border-broadcast-line"}`}>
        <div className="border-b border-broadcast-line px-4 py-3">
          <div className={`font-mono text-xs uppercase tracking-widest ${isHltv3 ? "text-broadcast-green" : "text-broadcast-muted"}`}>
            Live roster — pick {Math.min(pickNumber, totalPicks)}/{totalPicks}
          </div>
        </div>

        <div className="flex flex-col divide-y divide-broadcast-line">
          {activeSlotOrder.map((roleId) => (
            <RoleSlot
              key={roleId}
              roleId={roleId}
              occupant={assignments[roleId]}
              originLabel={assignments[roleId] ? originById[assignments[roleId].id] : null}
              statsRevealed={statsRevealed}
              isHltv3={isHltv3}
              isIgl={isHltv3 && iglPlayerId && assignments[roleId] && iglPlayerId === assignments[roleId].id}
            />
          ))}
        </div>

        {isHltv3 && (
          <IglBadgeArea iglPlayerId={iglPlayerId} assignments={assignments} />
        )}

        {pendingPlayer && (
          <div className="border-t border-broadcast-line p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-broadcast-orange">
              Unplaced — drag into a slot
            </div>
            <PendingCard player={pendingPlayer} originLabel={originById[pendingPlayer.id]} statsRevealed={statsRevealed} />
          </div>
        )}

      </div>
    </aside>
  );
}

function buildOriginMap(draftedPlayers) {
  const map = {};
  for (const d of draftedPlayers) {
    const teamMajor = TEAM_MAJORS.find((t) => t.id === d.fromTeamMajor);
    map[d.player.id] = teamMajor ? `${teamMajor.org} · ${teamMajor.major}` : "";
  }
  return map;
}

function IglBadgeArea({ iglPlayerId, assignments }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "igl-badge",
    data: { type: "igl-badge" },
  });

  const iglPlayer = iglPlayerId
    ? Object.values(assignments).find((p) => p && p.id === iglPlayerId)
    : null;

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div className="border-t border-broadcast-line p-3">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-broadcast-green/70">
        IGL badge — drag onto a player
      </div>
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`flex w-full cursor-grab items-center justify-between gap-2 rounded-sm border border-broadcast-green/40 bg-broadcast-green/10 px-3 py-2 text-left active:cursor-grabbing ${
          isDragging ? "opacity-40" : ""
        }`}
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-green">
            In-Game Leader
          </div>
          {iglPlayer ? (
            <div className="font-display text-sm font-bold uppercase">
              {iglPlayer.name}
            </div>
          ) : (
            <div className="font-mono text-[9px] text-broadcast-muted">Unassigned</div>
          )}
        </div>
        <div className="shrink-0 font-mono text-[9px] text-broadcast-green/60">
          +0.02× / major
        </div>
      </button>
    </div>
  );
}

function RoleSlot({ roleId, occupant, originLabel, statsRevealed, isHltv3, isIgl }) {
  const role = ROLES.find((r) => r.id === roleId);
  const { setNodeRef, isOver } = useDroppable({ id: roleId, data: { type: "slot" } });
  const naturalFit = (!isHltv3 && occupant) ? occupant.roles.includes(roleId) : null;
  const accent = isHltv3 ? "green" : "orange";
  const slotLabel = isHltv3 ? HLTV3_SLOT_LABELS[roleId] : role?.label;
  const keyAttrs = isHltv3
    ? (roleId === "star" && occupant
        ? topAttrs(occupant, 3)
        : roleId === "awp" && occupant
          ? ["sniping", ...topAttrs(occupant, 4).filter((a) => a !== "sniping").slice(0, 2)]
          : (ROLE_KEY_ATTRIBUTES[roleId] ?? []))
    : [];

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-3 px-4 py-3 transition ${
        isOver ? (accent === "green" ? "bg-broadcast-green/10" : "bg-broadcast-orange/10") : ""
      }`}
    >
      <div className="w-24 shrink-0">
        <div className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest ${accent === "green" ? "text-broadcast-green" : "text-broadcast-orange"}`}>
          {slotLabel}
          {roleId === "star" && <span className="text-yellow-400">★</span>}
        </div>
        {isIgl && (
          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-broadcast-green/60">
            IGL
          </div>
        )}
        {isHltv3 && keyAttrs.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {keyAttrs.map((attrKey) => {
              const def = ATTRIBUTE_DEFS.find((d) => d.key === attrKey);
              if (!def) return null;
              const score = occupant ? (occupant[attrKey] ?? null) : null;
              const pct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
              const attrTier = score === null ? null : score >= 80 ? "blue" : score >= 60 ? "green" : score >= 35 ? "yellow" : "red";
              const barColor = score === null ? "bg-broadcast-muted/20" : tierBgClass(attrTier);
              return (
                <div key={attrKey} className="group/rattr relative flex items-center gap-1">
                  <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 whitespace-nowrap rounded-sm border border-broadcast-line bg-broadcast-bg px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest text-broadcast-text opacity-0 transition-opacity group-hover/rattr:opacity-100">
                    {def.name}
                  </div>
                  <def.Icon className="h-2.5 w-2.5 shrink-0 text-broadcast-muted/50 transition-colors group-hover/rattr:text-broadcast-muted" />
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-broadcast-bg">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score !== null ? pct : 0}%` }} />
                  </div>
                  <div className="w-5 text-right font-mono text-[8px] text-broadcast-muted">
                    {statsRevealed && score !== null ? score : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {occupant ? (
        <DraggableCard player={occupant} roleId={roleId} naturalFit={naturalFit} originLabel={originLabel} statsRevealed={statsRevealed} isHltv3={isHltv3} isIgl={isIgl} />
      ) : (
        <div
          className={`flex-1 rounded-sm border border-dashed px-3 py-2 font-mono text-xs uppercase tracking-widest ${
            isOver
              ? (accent === "green" ? "border-broadcast-green text-broadcast-green" : "border-broadcast-orange text-broadcast-orange")
              : "border-broadcast-line text-broadcast-muted"
          }`}
        >
          {isOver ? "Drop here" : "Empty"}
        </div>
      )}
    </div>
  );
}

function DraggableCard({ player, roleId, naturalFit, originLabel, statsRevealed, isHltv3, isIgl }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { type: "player" },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`flex-1 cursor-grab rounded-sm border px-3 py-2 text-left active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${
        isHltv3
          ? isIgl
            ? "border-broadcast-green/60 bg-broadcast-green/10"
            : "border-broadcast-green/40 bg-broadcast-green/5"
          : naturalFit ? "border-broadcast-green/40 bg-broadcast-green/5" : "border-broadcast-red/40 bg-broadcast-red/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-display text-base font-bold uppercase leading-tight truncate">{player.name}</div>
        {!isHltv3 && (
          <span
            className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
              naturalFit ? "bg-broadcast-green/15 text-broadcast-green" : "bg-broadcast-red/15 text-broadcast-red"
            }`}
          >
            {naturalFit ? "✓" : "!"}
          </span>
        )}
        {isHltv3 && isIgl && (
          <span className="shrink-0 rounded-sm bg-broadcast-green/20 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-broadcast-green">
            IGL
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {!isHltv3 && player.roles.map((r) => (
          <span key={r} className="rounded-sm bg-broadcast-bg px-1 py-0.5 font-mono text-[8px] uppercase tracking-wide text-broadcast-muted">
            {r}
          </span>
        ))}
        {statsRevealed && player.rating !== 0 && !isHltv3 && (
          <span className="rounded-sm bg-broadcast-bg px-1 py-0.5 font-mono text-[8px] uppercase tracking-wide text-broadcast-muted-2">
            {player.rating.toFixed(2)}
          </span>
        )}
        {statsRevealed && isHltv3 && player.rating3 && player.rating3 !== 0 && (
          <span className="rounded-sm bg-broadcast-bg px-1 py-0.5 font-mono text-[8px] uppercase tracking-wide text-broadcast-muted-2">
            {player.rating3.toFixed(2)}
          </span>
        )}
      </div>
    </button>
  );
}

function PendingCard({ player, originLabel, statsRevealed }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { type: "player" },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`flex w-full cursor-grab items-center justify-between gap-2 rounded-sm border-2 border-broadcast-orange bg-broadcast-orange/10 px-3 py-3 text-left active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div>
        <div className="font-display text-lg font-bold uppercase leading-tight">{player.name}</div>
        <div className="font-mono text-[10px] text-broadcast-muted">{originLabel}</div>
        <div className="mt-1 flex gap-1.5">
          {player.roles.map((r) => (
            <span
              key={r}
              className="rounded-sm border border-broadcast-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-broadcast-muted"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      {statsRevealed && <div className="font-mono text-xs text-broadcast-muted-2">RTG {player.rating !== 0 ? player.rating.toFixed(2) : "—"}</div>}
    </button>
  );
}

