import Link from "next/link";
import { signOut } from "@/app/actions";
import type { PoolTier } from "@/lib/types";

export default function Nav({
  tier,
  isAdmin,
}: {
  tier?: PoolTier;
  isAdmin?: boolean;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-pitch">
          <span className="text-xl">⚽</span> WK Pool
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {tier && (
            <>
              <NavLink href={`/pool/${tier}/voorspellen`}>Voorspellen</NavLink>
              <NavLink href={`/pool/${tier}/stand`}>Stand</NavLink>
              <NavLink href={`/pool/${tier}/deelnemers`}>Deelnemers</NavLink>
              <NavLink href={`/pool/${tier}/bonus`}>Bonus</NavLink>
            </>
          )}
          <NavLink href="/dashboard">Dashboard</NavLink>
          {isAdmin && <NavLink href="/admin">Beheer</NavLink>}
          <form action={signOut}>
            <button className="btn-ghost ml-1" type="submit">
              Uitloggen
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
