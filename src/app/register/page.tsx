"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signUp } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" type="submit" disabled={pending}>
      {pending ? "Bezig…" : "Account aanmaken"}
    </button>
  );
}

export default function RegisterPage() {
  const [state, action] = useFormState(signUp, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-2xl font-bold text-pitch">
          ⚽ WK Pool
        </Link>
        <form action={action} className="card space-y-4">
          <h1 className="text-lg font-bold">Account aanmaken</h1>
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Deelname is <strong>alleen op uitnodiging</strong>. Gebruik het
            e-mailadres waarop je bent uitgenodigd.
          </p>
          <div>
            <label className="label" htmlFor="full_name">Naam</label>
            <input className="input" id="full_name" name="full_name" type="text" required />
          </div>
          <div>
            <label className="label" htmlFor="email">E-mailadres</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Wachtwoord (min. 8 tekens)</label>
            <input className="input" id="password" name="password" type="password" required minLength={8} />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {state.message}
            </p>
          )}
          <SubmitButton />
          <p className="text-center text-sm text-slate-600">
            Heb je al een account?{" "}
            <Link href="/login" className="font-medium text-pitch hover:underline">
              Inloggen
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
