"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

// Uitnodiging aanmaken (deelname is alleen op uitnodiging)
export async function createInvitation(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const tierRaw = String(formData.get("pool_tier") ?? "");
  const pool_tier = tierRaw === "fun" || tierRaw === "win" ? tierRaw : null;
  if (!email) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("invitations").insert({ email, pool_tier, invited_by: user!.id });
  revalidatePath("/admin");
}

// Uitslag handmatig invoeren/wijzigen (triggert automatisch de puntentelling)
export async function setMatchResult(formData: FormData) {
  await requireAdmin();
  const matchId = String(formData.get("match_id") ?? "");
  const homeRaw = String(formData.get("home_score") ?? "");
  const awayRaw = String(formData.get("away_score") ?? "");
  const finished = formData.get("finished") === "on";

  const home_score = homeRaw === "" ? null : parseInt(homeRaw, 10);
  const away_score = awayRaw === "" ? null : parseInt(awayRaw, 10);

  const supabase = await createClient();
  await supabase
    .from("matches")
    .update({
      home_score,
      away_score,
      status: finished ? "finished" : "scheduled",
    })
    .eq("id", matchId);
  revalidatePath("/admin");
}

// Werkelijke kampioen + topscorer instellen + bonus vergrendelen
export async function setTournament(formData: FormData) {
  await requireAdmin();
  const champion = String(formData.get("champion_team_id") ?? "");
  const topScorer = String(formData.get("top_scorer") ?? "").trim();
  const lockBonus = formData.get("lock_bonus") === "on";

  const supabase = await createClient();
  await supabase
    .from("tournament")
    .update({
      champion_team_id: champion || null,
      top_scorer: topScorer || null,
      bonus_locked_at: lockBonus ? new Date().toISOString() : null,
    })
    .eq("id", 1);
  revalidatePath("/admin");
}

// Puntenschema van een pool aanpassen
export async function updateScoringRules(formData: FormData) {
  await requireAdmin();
  const poolId = String(formData.get("pool_id") ?? "");
  const num = (k: string) => parseInt(String(formData.get(k) ?? "0"), 10) || 0;

  const supabase = await createClient();
  await supabase
    .from("scoring_rules")
    .update({
      points_toto: num("points_toto"),
      points_exact: num("points_exact"),
      points_goal_diff: num("points_goal_diff"),
      points_scorer: num("points_scorer"),
      points_champion: num("points_champion"),
      points_top_scorer: num("points_top_scorer"),
    })
    .eq("pool_id", poolId);
  revalidatePath("/admin");
}

// Betaalstatus van een deelnemer omzetten
export async function togglePaid(formData: FormData) {
  await requireAdmin();
  const memberId = String(formData.get("member_id") ?? "");
  const paid = formData.get("paid") === "true";
  const supabase = await createClient();
  await supabase.from("pool_members").update({ paid: !paid }).eq("id", memberId);
  revalidatePath("/admin");
}

// Iemand beheerder maken / af
export async function toggleAdmin(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const isAdmin = formData.get("is_admin") === "true";
  const supabase = await createClient();
  await supabase.from("profiles").update({ is_admin: !isAdmin }).eq("id", userId);
  revalidatePath("/admin");
}

// WK-uitslagen automatisch ophalen via de Edge Function "sync-results"
export async function syncResults() {
  await requireAdmin();
  const supabase = await createClient();
  try {
    await supabase.functions.invoke("sync-results");
  } catch {
    // Function nog niet gedeployed of API-key ontbreekt — handmatige invoer blijft mogelijk.
  }
  revalidatePath("/admin");
}
