import Nav from "@/components/Nav";
import { getPoolContext } from "@/lib/pool";
import { saveBonus } from "@/app/actions";
import type { Team } from "@/lib/types";

export default async function BonusPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const { supabase, pool, isAdmin, user } = await getPoolContext(tier);

  const [{ data: teams }, { data: bonus }, { data: tournament }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("bonus_predictions")
      .select("*")
      .eq("pool_id", pool.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("tournament").select("bonus_locked_at").eq("id", 1).single(),
  ]);

  const locked = tournament?.bonus_locked_at
    ? Date.now() >= new Date(tournament.bonus_locked_at).getTime()
    : false;

  return (
    <>
      <Nav tier={pool.tier} isAdmin={isAdmin} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-bold">Bonusvragen — {pool.name}</h1>
        <p className="mt-1 text-slate-600">
          Voorspel de wereldkampioen en de topscorer voor extra punten.
        </p>

        {locked && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            🔒 De bonusvragen zijn gesloten — je kunt niet meer wijzigen.
          </p>
        )}

        <form action={saveBonus} className="card mt-6 space-y-4">
          <input type="hidden" name="pool_id" value={pool.id} />
          <input type="hidden" name="tier" value={pool.tier} />

          <div>
            <label className="label" htmlFor="champion_team_id">🏆 Wereldkampioen</label>
            <select
              className="input"
              id="champion_team_id"
              name="champion_team_id"
              defaultValue={bonus?.champion_team_id ?? ""}
              disabled={locked}
            >
              <option value="">— kies een land —</option>
              {(teams as Team[] | null)?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.flag_emoji} {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="top_scorer">⚽ Topscorer (naam speler)</label>
            <input
              className="input"
              id="top_scorer"
              name="top_scorer"
              type="text"
              placeholder="bv. Memphis Depay"
              defaultValue={bonus?.top_scorer ?? ""}
              disabled={locked}
            />
          </div>

          {!locked && (
            <button className="btn-primary w-full" type="submit">
              Opslaan
            </button>
          )}

          {bonus && (bonus.points ?? 0) > 0 && (
            <p className="text-center text-sm font-semibold text-pitch">
              Je hebt {bonus.points} bonuspunten behaald.
            </p>
          )}
        </form>
      </main>
    </>
  );
}
