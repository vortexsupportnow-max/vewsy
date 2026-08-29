"use client";

import Link from "next/link";

import { useAuth } from "./auth-provider";
import { Avatar } from "./avatar";

export function SiteHeader() {
  const { user, profile, loading } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-muted/12 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Vewsy<span className="text-accent">.</span>
        </Link>

        {loading ? (
          <div className="h-9 w-28 animate-pulse rounded-full bg-surface" />
        ) : user && profile ? (
          <nav className="flex items-center gap-1">
            {/* Un pallino sull'avatar è l'unico posto in cui l'email non
                verificata si fa notare senza bloccare l'uso dell'app. */}
            <Link
              href="/modifica"
              className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-text"
            >
              Modifica
            </Link>
            <Link
              href="/statistiche"
              className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-text"
            >
              Statistiche
            </Link>
            <Link
              href="/account"
              className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-text"
            >
              Account
            </Link>
            <Link
              href={`/${profile.username}`}
              className="hairline relative ml-1 flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 transition-colors hover:border-accent/40"
            >
              <Avatar profile={profile} size={28} />
              <span className="text-sm">@{profile.username}</span>
              {!user.emailVerified && (
                <span
                  title="Email da confermare"
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent"
                />
              )}
            </Link>
          </nav>
        ) : (
          <Link
            href="/accedi"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Accedi
          </Link>
        )}
      </div>
    </header>
  );
}
