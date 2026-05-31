// ============================================================================
// Supabase Edge Function: sync-results
// Haalt wedstrijden + uitslagen op bij football-data.org en zet ze in de
// database. Nieuwe uitslagen triggeren automatisch de puntentelling (zie
// trigger trg_match_result in de database).
//
// Plan dit als cron (bv. elke 10 min) of roep het handmatig aan vanuit het
// beheerscherm. Vereist secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// FOOTBALL_DATA_API_KEY, FOOTBALL_DATA_COMPETITION (bv. "WC").
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("FOOTBALL_DATA_API_KEY")!;
const COMPETITION = Deno.env.get("FOOTBALL_DATA_COMPETITION") ?? "WC";

type FdTeam = { id: number; name: string; tla?: string; crest?: string };
type FdMatch = {
  id: number;
  stage: string;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED ...
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
};

function mapStatus(s: string): "scheduled" | "live" | "finished" {
  if (s === "FINISHED" || s === "AWARDED") return "finished";
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  return "scheduled";
}

function dutchStage(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "Groepsfase",
    LAST_16: "Achtste finale",
    QUARTER_FINALS: "Kwartfinale",
    SEMI_FINALS: "Halve finale",
    THIRD_PLACE: "Troostfinale",
    FINAL: "Finale",
  };
  return map[stage] ?? stage;
}

Deno.serve(async (req) => {
  try {
    if (!API_KEY) {
      return json({ error: "FOOTBALL_DATA_API_KEY ontbreekt" }, 500);
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`,
      { headers: { "X-Auth-Token": API_KEY } },
    );
    if (!res.ok) {
      return json({ error: `football-data.org ${res.status}`, body: await res.text() }, 502);
    }
    const data = (await res.json()) as { matches: FdMatch[] };
    const matches = data.matches ?? [];

    // 1) Teams upserten op external_id
    const teams = new Map<number, FdTeam>();
    for (const m of matches) {
      if (m.homeTeam?.id) teams.set(m.homeTeam.id, m.homeTeam);
      if (m.awayTeam?.id) teams.set(m.awayTeam.id, m.awayTeam);
    }
    for (const t of teams.values()) {
      await supabase.from("teams").upsert(
        { external_id: String(t.id), name: t.name, code: t.tla ?? null },
        { onConflict: "external_id" },
      );
    }
    const { data: teamRows } = await supabase.from("teams").select("id, external_id");
    const teamId = new Map((teamRows ?? []).map((r) => [r.external_id, r.id]));

    // 2) Wedstrijden upserten op external_id (incl. uitslag)
    let upserted = 0;
    for (const m of matches) {
      const home = teamId.get(String(m.homeTeam?.id));
      const away = teamId.get(String(m.awayTeam?.id));
      if (!home || !away) continue;
      const { error } = await supabase.from("matches").upsert(
        {
          external_id: String(m.id),
          stage: dutchStage(m.stage),
          home_team_id: home,
          away_team_id: away,
          kickoff: m.utcDate,
          status: mapStatus(m.status),
          home_score: m.score?.fullTime?.home ?? null,
          away_score: m.score?.fullTime?.away ?? null,
        },
        { onConflict: "external_id" },
      );
      if (!error) upserted++;
    }

    return json({ ok: true, teams: teams.size, matches: upserted });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
