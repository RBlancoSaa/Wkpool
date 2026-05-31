import Nav from "@/components/Nav";
import MatchCard from "@/components/MatchCard";
import { getPoolContext } from "@/lib/pool";
import type { Match, Team } from "@/lib/types";

export default async function VoorspellenPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const { supabase, pool, isAdmin } = await getPoolContext(tier);

  const [{ data: matches }, { data: teams }, { data: predictions }] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff"),
    supabase.from("teams").select("*"),
    supabase.from("predictions").select("*").eq("pool_id", pool.id),
  ]);

  const teamMap = new Map((teams as Team[] | null)?.map((t) => [t.id, t]) ?? []);
  const predMap = new Map((predictions ?? []).map((p) => [p.match_id, p]));

  return (
    <>
      <Nav tier={pool.tier} isAdmin={isAdmin} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Voorspellen — {pool.name}</h1>
        <p className="mt-1 text-slate-600">
          Vul je voorspelling in. Inleggen kan tot uiterlijk de deadline van elke
          wedstrijd (aftrap + speelminuten). Daarna sluit het automatisch.
        </p>

        {(!matches || matches.length === 0) && (
          <p className="mt-8 rounded-lg bg-amber-50 p-4 text-amber-800">
            Er zijn nog geen wedstrijden ingeladen. De beheerder kan deze
            ophalen via het beheerscherm.
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(matches as Match[] | null)?.map((m) => (
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
      </main>
    </>
  );
}
