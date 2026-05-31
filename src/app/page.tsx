import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// redirect() werkt intern via een thrown error; die moeten we doorlaten.
function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export default async function Home() {
  // Robuust: als Supabase (nog) niet geconfigureerd/bereikbaar is, tonen we
  // gewoon de landingspagina i.p.v. een server-side fout.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  } catch (e) {
    if (isRedirectError(e)) throw e;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-pitch to-pitch-dark text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center">
        <div className="text-6xl">⚽</div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          WK Pool
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/90">
          Voorspel de wedstrijden van het WK en strijd om de meeste punten.
          Twee pools — doe mee voor de <strong>fun</strong> of speel om te{" "}
          <strong>winnen</strong>. Deelname is alleen op uitnodiging.
        </p>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white/10 p-6 text-left backdrop-blur">
            <h2 className="text-xl font-bold">🎉 Fun pool</h2>
            <p className="mt-1 text-white/80">Voor de gezelligheid.</p>
            <p className="mt-3 text-2xl font-extrabold">€ 10,-</p>
            <p className="text-sm text-white/70">per persoon</p>
          </div>
          <div className="rounded-xl bg-white/10 p-6 text-left backdrop-blur ring-2 ring-gold">
            <h2 className="text-xl font-bold">🏆 Winnen pool</h2>
            <p className="mt-1 text-white/80">Voor de fanatiekelingen.</p>
            <p className="mt-3 text-2xl font-extrabold">€ 100,-</p>
            <p className="text-sm text-white/70">per persoon</p>
          </div>
        </div>

        <div className="mt-10 flex gap-3">
          <Link href="/login" className="btn bg-white text-pitch hover:bg-slate-100">
            Inloggen
          </Link>
          <Link
            href="/register"
            className="btn border border-white/60 text-white hover:bg-white/10"
          >
            Account aanmaken
          </Link>
        </div>
      </div>
    </main>
  );
}
