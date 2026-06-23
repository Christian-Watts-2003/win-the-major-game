import { useState } from "react";

// onChoose({ statsRevealed: bool, gameMode: "classic" | "hltv3" })
export default function ModeSelectScreen({ onChoose }) {
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (!selected) return;
    if (selected === "hltv3") {
      onChoose({ statsRevealed: true, gameMode: "hltv3" });
    } else if (selected === "csiq") {
      onChoose({ statsRevealed: false, gameMode: "hltv3" });
    } else {
      onChoose({ statsRevealed: selected === "stats", gameMode: "classic" });
    }
  };

  const isHltv3Mode = selected === "hltv3" || selected === "csiq";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
      <div className="text-center">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
          Choose your mode
        </h1>
        <p className="mt-3 text-broadcast-muted-2">
          How do you want to draft?
        </p>
      </div>

      {/* Classic modes */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-broadcast-muted/50">Classic</span>
          <div className="h-px flex-1 bg-broadcast-line/40" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-broadcast-muted/40">2014–2024 · All eras</span>
        </div>
        <div className="relative grid gap-4 sm:grid-cols-2">
          <div className="pointer-events-none select-none opacity-40">
            <ModeCard
              title="Stats Revealed"
              tagline="See the numbers"
              description="Every player's Rating, K/D, ADR, and Impact are shown while you draft, so you can build the statistically strongest five."
              accent="orange"
              selected={false}
              onClick={() => {}}
              disabled
            />
          </div>
          <div className="pointer-events-none select-none opacity-40">
            <ModeCard
              title="CS Knowledge"
              tagline="Trust your memory"
              description="No numbers. You still see each player's name, team, era, and role — but stats stay hidden. Stats still drive the result behind the scenes."
              accent="orange"
              selected={false}
              onClick={() => {}}
              disabled
            />
          </div>
          {/* Construction tape overlay */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-sm">
            <div className="w-full rotate-[-4deg] bg-yellow-400 py-2 text-center font-display text-sm font-black uppercase tracking-widest text-yellow-900 shadow-lg"
              style={{ backgroundImage: "repeating-linear-gradient(90deg, #facc15 0px, #facc15 48px, #1a1200 48px, #1a1200 96px)", backgroundSize: "96px 100%" }}>
              🚧 &nbsp;Under Construction&nbsp; 🚧 &nbsp;Under Construction&nbsp; 🚧 &nbsp;Under Construction&nbsp; 🚧 &nbsp;Under Construction&nbsp; 🚧
            </div>
            <div className="rounded-sm border border-yellow-400/40 bg-yellow-400/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-yellow-400">
              Classic mode coming soon
            </div>
          </div>
        </div>
      </div>

      {/* HLTV 3.0 modes */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-broadcast-green/70">HLTV 3.0</span>
          <div className="h-px flex-1 bg-broadcast-green/20" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-broadcast-green/40">CS2 Era · 2024–2026</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <HLTV3Card
            selected={selected === "hltv3"}
            onClick={() => setSelected("hltv3")}
          />
          <CSIQCard
            selected={selected === "csiq"}
            onClick={() => setSelected("csiq")}
          />
        </div>
      </div>

      <div className="mt-10 flex justify-center">
        <button
          onClick={handleContinue}
          disabled={!selected || selected === "stats" || selected === "knowledge"}
          className={`rounded-sm px-10 py-4 font-display text-xl font-bold uppercase tracking-wide text-broadcast-bg transition disabled:cursor-not-allowed disabled:opacity-30 ${
            isHltv3Mode
              ? "bg-broadcast-green hover:bg-white"
              : "bg-broadcast-orange hover:bg-white"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ModeCard({ title, tagline, description, accent, selected, onClick, disabled }) {
  const accentClass = accent === "green" ? "text-broadcast-green" : "text-broadcast-orange";
  const borderClass = selected
    ? accent === "green" ? "border-broadcast-green" : "border-broadcast-orange"
    : "border-broadcast-line";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col gap-3 rounded-sm border-2 bg-broadcast-panel-raised p-6 text-left transition ${borderClass} ${disabled ? "cursor-not-allowed" : "hover:border-broadcast-muted-2"}`}
    >
      <div className={`font-mono text-xs uppercase tracking-widest ${accentClass}`}>{tagline}</div>
      <div className="font-display text-3xl font-black uppercase tracking-tight">{title}</div>
      <p className="text-sm text-broadcast-muted-2">{description}</p>
      {selected && (
        <div className={`mt-2 font-mono text-xs uppercase tracking-widest ${accentClass}`}>
          ✓ Selected
        </div>
      )}
    </button>
  );
}

function HLTV3Card({ selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col gap-3 rounded-sm border-2 bg-broadcast-panel-raised p-6 text-left transition hover:border-broadcast-green/60 ${
        selected ? "border-broadcast-green" : "border-broadcast-line"
      }`}
    >
      <div className="absolute right-4 top-4 rounded-sm border border-broadcast-green/40 bg-broadcast-green/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-broadcast-green">
        Stats on
      </div>
      <div className="font-mono text-xs uppercase tracking-widest text-broadcast-green">Full analytics</div>
      <div className="font-display text-3xl font-black uppercase tracking-tight">HLTV 3.0</div>
      <p className="text-sm text-broadcast-muted-2">
        Draft from CS2-era rosters with full HLTV 3.0 stats visible — Rating, KAST, KPR, DPR, and attribute scores. Build the strongest lineup by the numbers.
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {["RTG 3.0", "KAST", "KPR", "DPR", "Firepower", "Opening", "Clutch"].map((s) => (
          <span key={s} className="rounded-sm border border-broadcast-green/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-broadcast-green/60">
            {s}
          </span>
        ))}
      </div>
      {selected && (
        <div className="mt-1 font-mono text-xs uppercase tracking-widest text-broadcast-green">✓ Selected</div>
      )}
    </button>
  );
}

function CSIQCard({ selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col gap-3 rounded-sm border-2 bg-broadcast-panel-raised p-6 text-left transition hover:border-broadcast-green/60 ${
        selected ? "border-broadcast-green" : "border-broadcast-line"
      }`}
    >
      <div className="absolute right-4 top-4 rounded-sm border border-broadcast-green/40 bg-broadcast-green/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-broadcast-green">
        Stats hidden
      </div>
      <div className="font-mono text-xs uppercase tracking-widest text-broadcast-green">Trust your knowledge</div>
      <div className="font-display text-3xl font-black uppercase tracking-tight">CS-IQ</div>
      <p className="text-sm text-broadcast-muted-2">
        CS2-era rosters, no numbers. You see names and attribute bars — but no ratings. Draft on instinct and CS knowledge alone. Stats still drive the result.
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {["Names only", "Attribute bars", "No ratings", "HLTV 3.0 pool"].map((s) => (
          <span key={s} className="rounded-sm border border-broadcast-green/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-broadcast-green/60">
            {s}
          </span>
        ))}
      </div>
      {selected && (
        <div className="mt-1 font-mono text-xs uppercase tracking-widest text-broadcast-green">✓ Selected</div>
      )}
    </button>
  );
}
