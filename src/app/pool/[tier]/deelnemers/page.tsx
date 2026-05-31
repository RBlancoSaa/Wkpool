import Nav from "@/components/Nav";
import { getPoolContext } from "@/lib/pool";
import { euro } from "@/lib/types";

export default async function DeelnemersPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const { supabase, pool, isAdmin } = await getPoolContext(tier);

  const { data: members } = await supabase
    .from("pool_members")
    .select("user_id, paid, joined_at, profiles(full_name)")
    .eq("pool_id", pool.id)
    .order("joined_at");

  const rows = (members ?? []) as unknown as Array<{
    user_id: string;
    paid: boolean;
    joined_at: string;
    profiles: { full_name: string } | { full_name: string }[] | null;
  }>;

  const nameOf = (p: { full_name: string } | { full_name: string }[] | null) =>
    (Array.isArray(p) ? p[0]?.full_name : p?.full_name) || "Onbekend";

  return (
    <>
      <Nav tier={pool.tier} isAdmin={isAdmin} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Deelnemers — {pool.name}</h1>
        <p className="mt-1 text-slate-600">
          {rows.length} {rows.length === 1 ? "deelnemer" : "deelnemers"} · inleg{" "}
          {euro(pool.entry_fee_cents)} p.p. · totale pot{" "}
          <strong>{euro(rows.length * pool.entry_fee_cents)}</strong>
        </p>

        <div className="card mt-6 overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Speler</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.user_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{nameOf(m.profiles)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`badge ${
                        m.paid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {m.paid ? "Betaald" : "Nog niet betaald"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
