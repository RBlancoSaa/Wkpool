import Nav from "@/components/Nav";
import { requireAdmin } from "@/lib/admin";
import {
  createInvitation,
  setMatchResult,
  setTournament,
  updateScoringRules,
  togglePaid,
  toggleAdmin,
  syncResults,
} from "./actions";
import { euro, type Match, type Team, type Pool } from "@/lib/types";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();

  const [
    { data: pools },
    { data: teams },
    { data: matches },
    { data: rules },
    { data: invitations },
    { data: tournament },
    { data: members },
  ] = await Promise.all([
    supabase.from("pools").select("*").order("entry_fee_cents"),
    supabase.from("teams").select("*").order("name"),
    supabase.from("matches").select("*").order("kickoff"),
    supabase.from("scoring_rules").select("*"),
    supabase.from("invitations").select("*").order("created_at", { ascending: false }),
    supabase.from("tournament").select("*").eq("id", 1).single(),
    supabase
      .from("pool_members")
      .select("id, paid, user_id, pool_id, profiles(full_name)")
      .order("joined_at"),
  ]);

  const teamMap = new Map((teams as Team[] | null)?.map((t) => [t.id, t]) ?? []);
  const poolMap = new Map((pools as Pool[] | null)?.map((p) => [p.id, p]) ?? []);
  const ruleMap = new Map((rules ?? []).map((r: any) => [r.pool_id, r]));

  return (
    <>
      <Nav isAdmin />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-2xl font-bold">Beheer</h1>

        {/* Synchronisatie */}
        <section className="card">
          <h2 className="text-lg font-bold">⚙️ Automatische uitslagen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Haal wedstrijden en uitslagen op bij football-data.org. Vereist dat
            de Edge Function <code>sync-results</code> is gedeployed en de
            API-sleutel is ingesteld.
          </p>
          <form action={syncResults} className="mt-3">
            <button className="btn-primary" type="submit">Nu synchroniseren</button>
          </form>
        </section>

        {/* Uitnodigingen */}
        <section className="card">
          <h2 className="text-lg font-bold">✉️ Uitnodigingen</h2>
          <form action={createInvitation} className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="label">E-mailadres</label>
              <input className="input" name="email" type="email" required />
            </div>
            <div>
              <label className="label">Pool</label>
              <select className="input" name="pool_tier" defaultValue="">
                <option value="">Beide</option>
                <option value="fun">Fun</option>
                <option value="win">Winnen</option>
              </select>
            </div>
            <button className="btn-primary" type="submit">Uitnodigen</button>
          </form>

          <div className="mt-4 max-h-48 overflow-auto text-sm">
            {(invitations ?? []).map((inv: any) => (
              <div key={inv.id} className="flex justify-between border-b border-slate-100 py-1">
                <span>{inv.email} {inv.pool_tier ? `(${inv.pool_tier})` : ""}</span>
                <span className={inv.accepted_by ? "text-green-600" : "text-amber-600"}>
                  {inv.accepted_by ? "geaccepteerd" : "open"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Toernooi: kampioen + topscorer */}
        <section className="card">
          <h2 className="text-lg font-bold">🏆 Toernooi-uitslag (bonus)</h2>
          <form action={setTournament} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Wereldkampioen</label>
              <select className="input" name="champion_team_id" defaultValue={tournament?.champion_team_id ?? ""}>
                <option value="">— nog niet bekend —</option>
                {(teams as Team[] | null)?.map((t) => (
                  <option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Topscorer</label>
              <input className="input" name="top_scorer" defaultValue={tournament?.top_scorer ?? ""} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="lock_bonus" defaultChecked={Boolean(tournament?.bonus_locked_at)} />
              Bonusvragen vergrendelen (deelnemers kunnen niet meer wijzigen)
            </label>
            <div className="sm:col-span-2">
              <button className="btn-primary" type="submit">Opslaan</button>
            </div>
          </form>
        </section>

        {/* Puntenschema per pool */}
        <section className="card">
          <h2 className="text-lg font-bold">🔢 Puntenschema per pool</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            {(pools as Pool[] | null)?.map((pool) => {
              const r: any = ruleMap.get(pool.id) ?? {};
              return (
                <form key={pool.id} action={updateScoringRules} className="rounded-lg border border-slate-200 p-4">
                  <input type="hidden" name="pool_id" value={pool.id} />
                  <h3 className="font-semibold">{pool.name}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <RuleInput name="points_toto" label="Juiste uitslag" value={r.points_toto} />
                    <RuleInput name="points_exact" label="Exacte score" value={r.points_exact} />
                    <RuleInput name="points_goal_diff" label="Doelsaldo" value={r.points_goal_diff} />
                    <RuleInput name="points_scorer" label="Eerste scorer" value={r.points_scorer} />
                    <RuleInput name="points_champion" label="Kampioen" value={r.points_champion} />
                    <RuleInput name="points_top_scorer" label="Topscorer" value={r.points_top_scorer} />
                  </div>
                  <button className="btn-primary mt-3 w-full" type="submit">Opslaan</button>
                </form>
              );
            })}
          </div>
        </section>

        {/* Wedstrijden / uitslagen */}
        <section className="card">
          <h2 className="text-lg font-bold">📋 Wedstrijden & uitslagen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Handmatige invoer (achtervang). Vink "klaar" aan om de wedstrijd af
            te ronden en de punten te berekenen.
          </p>
          <div className="mt-3 space-y-2">
            {(matches as Match[] | null)?.map((m) => {
              const home = m.home_team_id ? teamMap.get(m.home_team_id) : undefined;
              const away = m.away_team_id ? teamMap.get(m.away_team_id) : undefined;
              return (
                <form key={m.id} action={setMatchResult} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-2 text-sm">
                  <input type="hidden" name="match_id" value={m.id} />
                  <span className="w-40 truncate text-slate-500">{m.stage}</span>
                  <span className="flex-1">
                    {home?.flag_emoji} {home?.code ?? "?"} – {away?.code ?? "?"} {away?.flag_emoji}
                  </span>
                  <input className="input w-14 text-center" type="number" min={0} name="home_score" defaultValue={m.home_score ?? ""} />
                  <input className="input w-14 text-center" type="number" min={0} name="away_score" defaultValue={m.away_score ?? ""} />
                  <label className="flex items-center gap-1">
                    <input type="checkbox" name="finished" defaultChecked={m.status === "finished"} /> klaar
                  </label>
                  <button className="btn-ghost" type="submit">Opslaan</button>
                </form>
              );
            })}
            {(!matches || matches.length === 0) && (
              <p className="text-sm text-slate-500">Nog geen wedstrijden. Gebruik "Nu synchroniseren".</p>
            )}
          </div>
        </section>

        {/* Deelnemers: betaald + admin */}
        <section className="card">
          <h2 className="text-lg font-bold">👥 Deelnemers</h2>
          <div className="mt-3 space-y-1 text-sm">
            {(members ?? []).map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-1">
                <span className="flex-1">
                  {m.profiles?.full_name || "Onbekend"} ·{" "}
                  <span className="text-slate-500">{poolMap.get(m.pool_id)?.name}</span>
                </span>
                <form action={togglePaid}>
                  <input type="hidden" name="member_id" value={m.id} />
                  <input type="hidden" name="paid" value={String(m.paid)} />
                  <button className={`badge ${m.paid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`} type="submit">
                    {m.paid ? "Betaald" : "Niet betaald"}
                  </button>
                </form>
                <form action={toggleAdmin}>
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <input type="hidden" name="is_admin" value="false" />
                  <button className="btn-ghost text-xs" type="submit">maak admin</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function RuleInput({ name, label, value }: { name: string; label: string; value?: number }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <input className="input" type="number" name={name} defaultValue={value ?? 0} />
    </label>
  );
}
