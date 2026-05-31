import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

// Tijdelijke diagnosepagina. Toont GEEN geheime waarden — alleen of de
// variabelen aanwezig zijn (en hun lengte) plus de namen van gevonden
// Supabase-gerelateerde variabelen. Verwijder deze pagina daarna weer.
export default function DiagPage() {
  const { url, key } = getSupabaseEnv();

  const relatedNames = Object.keys(process.env)
    .filter((n) => n.includes("SUPABASE") || n.startsWith("NEXT_PUBLIC"))
    .sort();

  return (
    <main style={{ fontFamily: "monospace", padding: 24, lineHeight: 1.6 }}>
      <h1>Diagnose — Supabase-configuratie</h1>
      <ul>
        <li>URL gevonden: <b>{url ? "JA" : "NEE"}</b> (lengte: {url?.length ?? 0})</li>
        <li>Sleutel gevonden: <b>{key ? "JA" : "NEE"}</b> (lengte: {key?.length ?? 0})</li>
        <li>
          URL begint met https://:{" "}
          <b>{url?.startsWith("https://") ? "JA" : "NEE"}</b>
        </li>
        <li>NODE_ENV: {process.env.NODE_ENV}</li>
        <li>VERCEL_ENV: {process.env.VERCEL_ENV ?? "(geen)"}</li>
      </ul>
      <h2>Gevonden variabelenamen (alleen namen):</h2>
      <pre>{relatedNames.length ? relatedNames.join("\n") : "(geen enkele gevonden)"}</pre>
    </main>
  );
}
