import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import { joinPool, leavePool } from "@/app/actions";
import { euro, type Pool } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: pools }, { data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("pools").select("*").order("entry_fee_cents"),
    supabase.from("profiles").select("full_name, is_admin").eq("id", user!.id).single(),
    supabase.from("pool_members").select("pool_id, paid"),
  ]);

  const memberOf = new Map((memberships ?? []).map((m) => [m.pool_id, m]));
  const joinedCount = memberOf.size;

  return (
    <>
      <Nav isAdmin={profile?.is_admin} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Banner */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-pitch to-pitch-light p-5 text-white shadow-md sm:p-6">
          <h1 className="text-xl font-bold sm:text-2xl">
            Hoi {profile?.full_name || "speler"} 👋
          </h1>
          <p className="mt-1 text-sm text-white/80">
            {joinedCount > 0
              ? `Je doet mee aan ${joinedCount} pool${joinedCount > 1 ? "s" : ""}. Succes met voorspellen!`
              : "Kies hieronder aan welke pool(s) je meedoet — je mag aan beide."}
          </p>
        </div>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pools
        </h2>

        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          {(pools as Pool[] | null)?.map((pool) => {
            const membership = memberOf.get(pool.id);
            const isMember = Boolean(membership);
            const isWin = pool.tier === "win";
            return (
              <div
                key={pool.id}
                className={`card flex flex-col ${
                  isWin ? "ring-1 ring-gold/40" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">
                    {isWin ? "🏆" : "🎉"} {pool.name}
                  </h2>
                  <span
                    className={`text-xl font-extrabold ${
                      isWin ? "text-amber-500" : "text-pitch"
                    }`}
                  >
                    {euro(pool.entry_fee_cents)}
                  </span>
                </div>
                <p className="mt-1 flex-1 text-sm text-slate-600">{pool.description}</p>

                {isMember ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-green-100 text-green-800">Je doet mee</span>
                      <span
                        className={`badge ${
                          membership?.paid
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {membership?.paid ? "Betaald" : "Nog niet betaald"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn-primary" href={`/pool/${pool.tier}/voorspellen`}>
                        Voorspellen
                      </Link>
                      <Link className="btn-ghost" href={`/pool/${pool.tier}/stand`}>
                        Stand
                      </Link>
                      <form action={leavePool}>
                        <input type="hidden" name="pool_id" value={pool.id} />
                        <button className="btn-ghost text-red-600" type="submit">
                          Verlaten
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <form action={joinPool} className="mt-4">
                    <input type="hidden" name="pool_id" value={pool.id} />
                    <button className="btn-primary w-full" type="submit">
                      Meedoen ({euro(pool.entry_fee_cents)})
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
