import Nav from "@/components/Nav";
import MatchCard from "@/components/MatchCard";
import { getPoolContext } from "@/lib/pool";
import { isLocked, type Match, type Team } from "@/lib/types";

// Knockout-rondes ná de poules, in de juiste volgorde.
const KNOCKOUT_ORDER = [
  "Achtste finale",
  "Kwartfinale",
  "Halve finale",
  "Troostfinale",
  "Finale",
];

function sectionLabel(m: Match): string {
  return m.group_name ?? m.stage ?? "Overig";
}

function sectionRank(label: string): number {
  if (label.toLowerCase().startsWith("groep")) return 0;
  const i = KNOCKOUT_ORDER.indexOf(label);
  return i >= 0 ? 100 + i : 200;
}

export default async function VoorspellenPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const { supabase, pool, isAdmin } = await getPoolContext(tier);

  const [{ data: matches }, { data: teams }, { data: predictions }] =
    await Promise.all([
      supabase.from("matches").select("*").order("kickoff"),
      supabase.from("teams").select("*"),
      supabase.from("predictions").select("*").eq("pool_id", pool.id),
    ]);

  const teamMap = new Map((teams as Team[] | null)?.map((t) => [t.id, t]) ?? []);
  const predMap = new Map((predictions ?? []).map((p) => [p.match_id, p]));
  const matchList = (matches as Match[] | null) ?? [];

  // Wedstrijden groeperen per poule (of per knockout-ronde).
  const sections = new Map<string, Match[]>();
  for (const m of matchList) {
    const label = sectionLabel(m);
    if (!sections.has(label)) sections.set(label, []);
    sections.get(label)!.push(m);
  }
  const ordered = [...sections.entries()].sort((a, b) => {
    const ra = sectionRank(a[0]);
    const rb = sectionRank(b[0]);
    return ra !== rb ? ra - rb : a[0].localeCompare(b[0], "nl");
  });

  // Voortgang (alleen wedstrijden die nog open staan tellen als "te doen").
  const openMatches = matchList.filter((m) => !isLocked(m) && m.status !== "finished");
  const openFilled = openMatches.filter((m) => predMap.has(m.id)).length;
  const pct = openMatches.length
    ? Math.round((openFilled / openMatches.length) * 100)
    : 100;

  return (
    <>
      <Nav tier={pool.tier} isAdmin={isAdmin} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Banner */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-pitch to-pitch-light p-5 text-white shadow-md sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                <span>⚽</span> Voorspellen
              </h1>
              <p className="mt-1 text-sm text-white/80">{pool.name}</p>
            </div>
            {openMatches.length > 0 && (
              <div className="text-right">
                <div className="text-2xl font-extrabold leading-none">
                  {openFilled}
                  <span className="text-base font-medium text-white/70">
                    {" "}/ {openMatches.length}
                  </span>
                </div>
                <div className="text-xs text-white/70">open wedstrijden ingevuld</div>
              </div>
            )}
          </div>

          {openMatches.length > 0 && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gold transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          <p className="mt-3 text-xs text-white/70">
            Inleggen kan tot de aftrap (+ speelminuten) van elke wedstrijd. Daarna
            sluit het automatisch.
          </p>
        </div>

        {matchList.length === 0 && (
          <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Er zijn nog geen wedstrijden ingeladen. De beheerder kan deze ophalen
            via het beheerscherm.
          </p>
        )}

        {/* Secties per poule */}
        <div className="mt-6 space-y-8">
          {ordered.map(([label, list]) => {
            const filled = list.filter((m) => predMap.has(m.id)).length;
            // Unieke vlaggen van de landen in deze poule.
            const flags = [
              ...new Set(
                list
                  .flatMap((m) => [m.home_team_id, m.away_team_id])
                  .map((id) => (id ? teamMap.get(id)?.flag_emoji : null))
                  .filter(Boolean),
              ),
            ];
            return (
              <section key={label}>
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-800">{label}</h2>
                    <span className="hidden text-lg sm:inline">
                      {flags.join(" ")}
                    </span>
                  </div>
                  <span className="badge bg-slate-100 text-slate-500">
                    {filled}/{list.length} ingevuld
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      home={m.home_team_id ? teamMap.get(m.home_team_id) : undefined}
                      away={m.away_team_id ? teamMap.get(m.away_team_id) : undefined}
                      poolId={pool.id}
                      tier={pool.tier}
                      prediction={predMap.get(m.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
