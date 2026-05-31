import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import type { Match, Team } from "@/lib/types";

type TeamStat = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // doelpunten voor
  ga: number; // doelpunten tegen
  points: number;
};

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: teams }, { data: matches }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user!.id).single(),
    supabase.from("teams").select("*"),
    supabase.from("matches").select("*").eq("status", "finished"),
  ]);

  const teamMap = new Map((teams as Team[] | null)?.map((t) => [t.id, t]) ?? []);
  const finished = ((matches as Match[] | null) ?? []).filter(
    (m) => m.home_score !== null && m.away_score !== null,
  );

  // --- Toernooi-brede cijfers ---------------------------------------------
  const played = finished.length;
  const totalGoals = finished.reduce(
    (sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0),
    0,
  );
  const avgGoals = played ? (totalGoals / played).toFixed(2) : "0";
  const draws = finished.filter((m) => m.home_score === m.away_score).length;
  const cleanSheets = finished.filter(
    (m) => m.home_score === 0 || m.away_score === 0,
  ).length;

  const highest = [...finished].sort(
    (a, b) =>
      (b.home_score ?? 0) + (b.away_score ?? 0) -
      ((a.home_score ?? 0) + (a.away_score ?? 0)),
  )[0];

  // --- Landenklassement ----------------------------------------------------
  const stats = new Map<string, TeamStat>();
  const ensure = (id: string | null): TeamStat | null => {
    if (!id) return null;
    const team = teamMap.get(id);
    if (!team) return null;
    if (!stats.has(id))
      stats.set(id, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
    return stats.get(id)!;
  };

  for (const m of finished) {
    const h = ensure(m.home_team_id);
    const a = ensure(m.away_team_id);
    const hs = m.home_score ?? 0;
    const as = m.away_score ?? 0;
    if (h) {
      h.played++; h.gf += hs; h.ga += as;
      if (hs > as) { h.won++; h.points += 3; }
      else if (hs === as) { h.drawn++; h.points += 1; }
      else h.lost++;
    }
    if (a) {
      a.played++; a.gf += as; a.ga += hs;
      if (as > hs) { a.won++; a.points += 3; }
      else if (as === hs) { a.drawn++; a.points += 1; }
      else a.lost++;
    }
  }

  const table = [...stats.values()].sort(
    (a, b) =>
      b.points - a.points ||
      (b.gf - b.ga) - (a.gf - a.ga) ||
      b.gf - a.gf,
  );

  return (
    <>
      <Nav isAdmin={profile?.is_admin} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">📊 WK-statistieken</h1>
        <p className="mt-1 text-slate-600">
          Live bijgewerkt op basis van de gespeelde WK-wedstrijden.
        </p>

        {played === 0 ? (
          <p className="mt-8 rounded-lg bg-amber-50 p-4 text-amber-800">
            Er zijn nog geen wedstrijden gespeeld. Zodra er uitslagen binnenkomen
            (automatisch via de sync of handmatig via Beheer), verschijnen hier
            de statistieken.
          </p>
        ) : (
          <>
            {/* Kerncijfers */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Gespeeld" value={played} />
              <StatCard label="Doelpunten" value={totalGoals} />
              <StatCard label="Gem. per duel" value={avgGoals} />
              <StatCard label="Gelijke spelen" value={draws} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2">
              <StatCard
                label="Clean sheets"
                value={cleanSheets}
                hint="duels waarin een team niet scoorde"
              />
              {highest && (
                <StatCard
                  label="Doelrijkste duel"
                  value={`${teamMap.get(highest.home_team_id ?? "")?.code ?? "?"} ${highest.home_score}-${highest.away_score} ${teamMap.get(highest.away_team_id ?? "")?.code ?? "?"}`}
                  hint={`${(highest.home_score ?? 0) + (highest.away_score ?? 0)} doelpunten`}
                />
              )}
            </div>

            {/* Landenklassement */}
            <h2 className="mt-8 text-lg font-bold">Landenklassement</h2>
            <div className="card mt-3 overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Land</th>
                    <th className="px-2 py-3 text-center" title="Gespeeld">G</th>
                    <th className="px-2 py-3 text-center" title="Winst">W</th>
                    <th className="px-2 py-3 text-center" title="Gelijk">G</th>
                    <th className="px-2 py-3 text-center" title="Verlies">V</th>
                    <th className="px-2 py-3 text-center" title="Voor">DV</th>
                    <th className="px-2 py-3 text-center" title="Tegen">DT</th>
                    <th className="px-2 py-3 text-center" title="Saldo">+/-</th>
                    <th className="px-3 py-3 text-center font-bold">Ptn</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((s, i) => (
                    <tr key={s.team.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {s.team.flag_emoji} {s.team.name}
                      </td>
                      <td className="px-2 py-2 text-center">{s.played}</td>
                      <td className="px-2 py-2 text-center">{s.won}</td>
                      <td className="px-2 py-2 text-center">{s.drawn}</td>
                      <td className="px-2 py-2 text-center">{s.lost}</td>
                      <td className="px-2 py-2 text-center">{s.gf}</td>
                      <td className="px-2 py-2 text-center">{s.ga}</td>
                      <td className="px-2 py-2 text-center">{s.gf - s.ga > 0 ? `+${s.gf - s.ga}` : s.gf - s.ga}</td>
                      <td className="px-3 py-2 text-center text-lg font-bold text-pitch">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-pitch">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
