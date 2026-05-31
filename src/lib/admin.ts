import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Controleert of de huidige gebruiker beheerder is; stuurt anders door.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");
  return { supabase, user, profile };
}
