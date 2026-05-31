import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error(
      "Supabase niet geconfigureerd: zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in de omgevingsvariabelen.",
    );
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Aangeroepen vanuit een Server Component — kan genegeerd worden
            // omdat de middleware de sessie ververst.
          }
        },
      },
    },
  );
}
