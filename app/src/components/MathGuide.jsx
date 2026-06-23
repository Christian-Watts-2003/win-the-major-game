import { ATTRIBUTE_DEFS, ROLE_KEY_ATTRIBUTES } from "../lib/attributeIcons";

const ROLES = [
  { id: "awp",     label: "AWPer", awp: true },
  { id: "entry",   label: "Entry" },
  { id: "support", label: "Support" },
  { id: "star",    label: "Star ★", star: true },
  { id: "lurker",  label: "Lurker" },
];

export default function MathGuide() {
  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="flex flex-col gap-4">

        {/* Role legend */}
        <div className="rounded-sm border border-broadcast-green/30 bg-broadcast-panel">
          <div className="border-b border-broadcast-line px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-green">
              Role guide
            </div>
          </div>
          <div className="flex flex-col divide-y divide-broadcast-line">
            {ROLES.map(({ id, label, star, awp }) => {
              const attrs = (star || awp) ? null : ROLE_KEY_ATTRIBUTES[id] ?? [];
              const snipingDef = ATTRIBUTE_DEFS.find((d) => d.key === "sniping");
              return (
                <div key={id} className="px-4 py-3">
                  <div className={`font-mono text-[10px] uppercase tracking-widest ${star ? "text-yellow-400" : "text-broadcast-green"}`}>
                    {label}
                  </div>
                  {star ? (
                    <p className="mt-1 text-[11px] leading-snug text-broadcast-muted-2">
                      All attributes considered equally. Any well-rounded player fits here.
                    </p>
                  ) : awp ? (
                    <div className="mt-1.5 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        {snipingDef && <snipingDef.Icon className="h-2.5 w-2.5 shrink-0 text-broadcast-muted/50" />}
                        <span className="font-mono text-[9px] uppercase tracking-wide text-broadcast-muted">Sniping</span>
                      </div>
                      <p className="text-[10px] leading-snug text-broadcast-muted/60 italic">+ player's top 2 attrs</p>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex flex-col gap-1">
                      {attrs.map((attrKey) => {
                        const def = ATTRIBUTE_DEFS.find((d) => d.key === attrKey);
                        if (!def) return null;
                        return (
                          <div key={attrKey} className="flex items-center gap-1.5">
                            <def.Icon className="h-2.5 w-2.5 shrink-0 text-broadcast-muted/50" />
                            <span className="font-mono text-[9px] uppercase tracking-wide text-broadcast-muted">
                              {def.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Brief explanations */}
        <div className="rounded-sm border border-broadcast-line bg-broadcast-panel">
          <div className="border-b border-broadcast-line px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted">
              How it works
            </div>
          </div>
          <div className="flex flex-col divide-y divide-broadcast-line">
            <Blurb title="Key attributes">
              Each role has attributes that are weighted most heavily when scoring a player in that slot.
              A player whose strengths align with their role's key attributes will contribute more to the team's overall rating.
            </Blurb>
            <Blurb title={<>Star <span className="text-yellow-400">★</span></>}>
              The star slot rewards versatility. All seven attributes contribute equally, and the scoring range is slightly wider than other roles — a truly elite all-rounder can push the ceiling here.
            </Blurb>
            <Blurb title="IGL designation">
              Drag the IGL badge onto a player to designate your in-game leader. The bonus scales with how many CS2 Majors that player has historically appeared at as an IGL — designating a player who has never called in a major gives no bonus.
            </Blurb>
          </div>
        </div>

      </div>
    </aside>
  );
}

function Blurb({ title, children }) {
  return (
    <div className="px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted-2">{title}</div>
      <p className="mt-1 text-[11px] leading-snug text-broadcast-muted-2">{children}</p>
    </div>
  );
}
