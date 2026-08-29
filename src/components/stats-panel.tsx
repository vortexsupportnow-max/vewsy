"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "./auth-provider";
import { PLATFORM_LABELS, PlatformIcon } from "./platform-icon";
import { getStats, type ProfileStats } from "@/lib/stats";
import type { Profile } from "@/lib/types";

type Load =
  | { state: "loading" }
  | { state: "ready"; stats: ProfileStats }
  | { state: "error"; message: string };

export function StatsPanel() {
  const { user, profile, loading } = useAuth();

  if (loading) return <p className="mt-8 text-muted">Caricamento…</p>;

  if (!user || !profile) {
    return (
      <p className="hairline mt-8 rounded-2xl px-5 py-8 text-center text-muted">
        <Link href="/accedi" className="text-accent underline-offset-4 hover:underline">
          Accedi
        </Link>{" "}
        per vedere le tue statistiche.
      </p>
    );
  }

  return <Panel key={profile.uid} profile={profile} />;
}

function Panel({ profile }: { profile: Profile }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    getStats(profile.uid)
      .then((stats) => !cancelled && setLoad({ state: "ready", stats }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setLoad({ state: "error", message: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      cancelled = true;
    };
  }, [profile.uid]);

  if (load.state === "loading") return <p className="mt-8 text-muted">Conteggio in corso…</p>;
  if (load.state === "error") {
    return <p className="mt-8 text-sm text-accent">Statistiche non leggibili: {load.message}</p>;
  }

  const { views, clicks } = load.stats;
  const totalClicks = Object.values(clicks).reduce((sum, n) => sum + n, 0);

  // Ordina i link per rendimento: è la domanda che il creator si fa davvero.
  const ranked = [...profile.links]
    .map((link) => ({ link, count: clicks[link.id] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Visite al profilo" value={views} />
        <Tile label="Click sui link" value={totalClicks} />
        <Tile
          label="Click per visita"
          value={views ? (totalClicks / views).toFixed(2) : "—"}
          hint="Quanti link apre chi passa"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Rendimento dei link</h2>

        {ranked.length === 0 ? (
          <p className="hairline rounded-2xl px-5 py-8 text-center text-sm text-muted">
            Non hai ancora link.{" "}
            <Link href="/modifica" className="text-accent underline-offset-4 hover:underline">
              Aggiungine uno
            </Link>
            .
          </p>
        ) : (
          ranked.map(({ link, count }) => (
            <div
              key={link.id}
              className="hairline flex items-center gap-4 rounded-xl bg-surface px-4 py-3"
            >
              <span className="text-accent">
                <PlatformIcon platform={link.platform} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {link.label || PLATFORM_LABELS[link.platform]}
              </span>
              {/* Barra proporzionale al migliore: mostra il rapporto tra i
                  link, che è più utile del numero assoluto. */}
              <span className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted/15 sm:block">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{
                    width: `${ranked[0].count ? (count / ranked[0].count) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="w-10 text-right text-sm tabular-nums">{count}</span>
            </div>
          ))
        )}
      </section>

      <p className="text-xs text-muted">
        Le visite sono contate una volta per sessione, così un refresh non gonfia il numero.
        Nessun dato sul visitatore viene raccolto: solo contatori.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="hairline flex flex-col gap-1 rounded-2xl bg-surface p-5">
      <span className="text-3xl font-semibold tabular-nums">{value}</span>
      <span className="text-sm text-muted">{label}</span>
      {hint && <span className="text-xs text-muted/70">{hint}</span>}
    </div>
  );
}
