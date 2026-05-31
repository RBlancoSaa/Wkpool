"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Authenticatie
// ---------------------------------------------------------------------------
export async function signIn(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Onjuist e-mailadres of wachtwoord." };
  redirect("/dashboard");
}

export async function signUp(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (password.length < 8) {
    return { error: "Kies een wachtwoord van minimaal 8 tekens." };
  }

  const supabase = await createClient();

  // Alleen op uitnodiging: controleer via een databasefunctie of er een
  // openstaande uitnodiging is voor dit e-mailadres (geen service-role nodig).
  const { data: invited } = await supabase.rpc("has_open_invitation", {
    p_email: email,
  });

  if (!invited) {
    return {
      error:
        "Geen geldige uitnodiging gevonden voor dit e-mailadres. Deelname is alleen op uitnodiging.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // Als e-mailbevestiging aan staat is er nog geen sessie: toon een melding.
  if (!data.session) {
    return {
      message:
        "Account aangemaakt! Bevestig je e-mailadres via de link in je mailbox en log daarna in.",
    };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Pools joinen / verlaten
// ---------------------------------------------------------------------------
export async function joinPool(formData: FormData) {
  const poolId = String(formData.get("pool_id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("pool_members").insert({ pool_id: poolId, user_id: user.id });
  revalidatePath("/dashboard");
}

export async function leavePool(formData: FormData) {
  const poolId = String(formData.get("pool_id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("pool_members")
    .delete()
    .eq("pool_id", poolId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Voorspelling opslaan (insert of update). De database (RLS) blokkeert dit
// automatisch zodra de deadline (kickoff + lock_minutes) is verstreken.
// ---------------------------------------------------------------------------
export async function savePrediction(formData: FormData) {
  const poolId = String(formData.get("pool_id") ?? "");
  const matchId = String(formData.get("match_id") ?? "");
  const tier = String(formData.get("tier") ?? "");
  const home = parseInt(String(formData.get("home_score") ?? ""), 10);
  const away = parseInt(String(formData.get("away_score") ?? ""), 10);
  const scorer = String(formData.get("scorer_team_id") ?? "");

  if (Number.isNaN(home) || Number.isNaN(away) || home < 0 || away < 0) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      pool_id: poolId,
      match_id: matchId,
      home_score: home,
      away_score: away,
      scorer_team_id: scorer || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,pool_id,match_id" },
  );

  revalidatePath(`/pool/${tier}/voorspellen`);
}

// ---------------------------------------------------------------------------
// Bonusvoorspelling (kampioen + topscorer) opslaan
// ---------------------------------------------------------------------------
export async function saveBonus(formData: FormData) {
  const poolId = String(formData.get("pool_id") ?? "");
  const tier = String(formData.get("tier") ?? "");
  const champion = String(formData.get("champion_team_id") ?? "");
  const topScorer = String(formData.get("top_scorer") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("bonus_predictions").upsert(
    {
      user_id: user.id,
      pool_id: poolId,
      champion_team_id: champion || null,
      top_scorer: topScorer || null,
    },
    { onConflict: "user_id,pool_id" },
  );

  revalidatePath(`/pool/${tier}/bonus`);
}
