import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Pool, PoolTier } from "@/lib/types";

// Laadt de pool op basis van de tier in de URL en controleert lidmaatschap.
// Stuurt door naar het dashboard als de gebruiker (nog) geen lid is.
export async function getPoolContext(tier: string) {
  if (tier !== "fun" && tier !== "win") redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pool } = await supabase
    .from("pools")
    .select("*")
    .eq("tier", tier)
    .single();
  if (!pool) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_admin")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("pool_members")
    .select("id")
    .eq("pool_id", (pool as Pool).id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  return {
    supabase,
    user,
    profile,
    isAdmin: Boolean(profile?.is_admin),
    pool: pool as Pool,
    tier: tier as PoolTier,
  };
}
