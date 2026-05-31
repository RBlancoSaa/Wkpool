"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signIn } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" type="submit" disabled={pending}>
      {pending ? "Bezig…" : "Inloggen"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(signIn, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-2xl font-bold text-pitch">
          ⚽ WK Pool
        </Link>
        <form action={action} className="card space-y-4">
          <h1 className="text-lg font-bold">Inloggen</h1>
          <div>
            <label className="label" htmlFor="email">E-mailadres</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Wachtwoord</label>
            <input className="input" id="password" name="password" type="password" required />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton />
          <p className="text-center text-sm text-slate-600">
            Nog geen account?{" "}
            <Link href="/register" className="font-medium text-pitch hover:underline">
              Registreren
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
