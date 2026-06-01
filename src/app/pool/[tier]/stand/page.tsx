import Nav from "@/components/Nav";
import { getPoolContext } from "@/lib/pool";
import type { Standing } from "@/lib/types";

export default async function StandPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const { supabase, pool, isAdmin, user } = await getPoolContext(tier);

  const { data } = await supabase
    .from("standings")
    .select("*")
    .eq("pool_id", pool.id)
    .order("total_points", { ascending: false });

  const standings = (data as Standing[] | null) ?? [];

  const leader = standings[0];

  return (
    <>
      <Nav tier={pool.tier} isAdmin={isAdmin} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Banner */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-pitch to-pitch-light p-5 text-white shadow-md sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                <span>🏆</span> Stand
              </h1>
              <p className="mt-1 text-sm text-white/80">{pool.name}</p>
            </div>
            {leader && (
              <div className="text-right">
                <div className="text-xs text-white/70">Koploper</div>
                <div className="text-lg font-bold">
                  🥇 {leader.full_name || "Onbekend"}
                </div>
                <div className="text-xs text-white/80">
                  {leader.total_points} punten
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card mt-6 overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Speler</th>
                <th className="px-4 py-3 text-right">Wedstrijd</th>
                <th className="px-4 py-3 text-right">Bonus</th>
                <th className="px-4 py-3 text-right">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr
                  key={s.user_id}
                  className={`border-t border-slate-100 ${
                    s.user_id === user.id ? "bg-pitch/5 font-semibold" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-4 py-3">{s.full_name || "Onbekend"}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{s.match_points}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{s.bonus_points}</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-pitch">
                    {s.total_points}
                  </td>
                </tr>
              ))}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nog geen deelnemers met punten.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
