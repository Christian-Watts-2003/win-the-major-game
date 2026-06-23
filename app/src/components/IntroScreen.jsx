import { ROLES, TEAM_MAJORS, MAJORS } from "../lib/draftData";

export default function IntroScreen({ onStart }) {
  const teamCount = TEAM_MAJORS.length;
  const playerCount = TEAM_MAJORS.reduce((sum, t) => sum + t.players.length, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
      <div className="relative overflow-hidden rounded-sm border border-broadcast-line bg-broadcast-panel">
        <div className="absolute inset-0 bg-gradient-to-br from-broadcast-orange/10 via-transparent to-transparent" />
        <div className="relative px-6 py-12 sm:px-12 sm:py-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-broadcast-orange/40 bg-broadcast-orange/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-broadcast-orange">
            <span className="h-1.5 w-1.5 rounded-full bg-broadcast-orange animate-pulse-glow" />
            Major Outcome Builder — 2014 to 2024
          </div>

          <h1 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">
            Can your<br />
            <span className="text-broadcast-orange">all-time five</span><br />
            win the Major?
          </h1>

          <p className="mt-6 max-w-xl text-base text-broadcast-muted-2 sm:text-lg">
            Spin for a team at a real Major. Draft a player who suited up for that
            exact roster at that event, then drag them into an open role. Repeat five
            times, then find out if your constructed legends are good enough to go all
            the way — or if they don't even make it out of the Swiss stage.
          </p>

          <button
            onClick={onStart}
            className="mt-10 inline-flex items-center gap-3 rounded-sm bg-broadcast-orange px-8 py-4 font-display text-xl font-bold uppercase tracking-wide text-broadcast-bg transition hover:bg-white"
          >
            Start the draft
            <span aria-hidden="true">→</span>
          </button>

          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-broadcast-line pt-8 sm:grid-cols-4">
            <Stat label="Major rosters" value={teamCount} />
            <Stat label="Pro players" value={playerCount} />
            <Stat label="Majors covered" value={MAJORS.length} />
            <Stat label="Open roles" value={ROLES.length} />
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-5">
        {ROLES.map((role) => (
          <div
            key={role.id}
            className="diagonal-clip rounded-sm border border-broadcast-line bg-broadcast-panel-raised px-4 py-4"
          >
            <div className="font-display text-lg font-bold uppercase text-broadcast-orange">
              {role.label}
            </div>
            <div className="mt-1 text-xs text-broadcast-muted-2">{role.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-display text-3xl font-black text-broadcast-text">{value}</div>
      <div className="font-mono text-xs uppercase tracking-widest text-broadcast-muted">{label}</div>
    </div>
  );
}
