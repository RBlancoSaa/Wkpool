// Leest de Supabase-config op runtime uit process.env.
//
// Belangrijk: een directe `process.env.NEXT_PUBLIC_X` wordt door Next.js
// tijdens de build vervangen door een vaste waarde. Stond de variabele er bij
// het bouwen nog niet, dan is die waarde voorgoed leeg. Door de naam dynamisch
// op te zoeken (variabele i.p.v. letterlijke property) gebeurt die inlining
// NIET en wordt de waarde op de server tijdens het draaien gelezen — precies
// hoe Vercel de variabelen aanlevert.
function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length > 0) return value;
  }
  return undefined;
}

export function getSupabaseEnv(): { url?: string; key?: string } {
  return {
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    key: readEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_KEY",
    ),
  };
}
