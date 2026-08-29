"use client";

import { useEffect, useMemo, useState } from "react";

import { ProfileCard } from "./profile-card";
import { listRecentProfiles, searchProfiles } from "@/lib/profiles";
import { MOCK_PROFILES } from "@/lib/mock-profiles";
import { CATEGORIES, type Category, type Profile } from "@/lib/types";

type Results =
  | { state: "loading" }
  | { state: "ready"; profiles: Profile[]; isMock: boolean }
  | { state: "error"; message: string };

export function Discovery() {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [location, setLocation] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [results, setResults] = useState<Results>({ state: "loading" });

  // I tag arrivano da un campo libero: virgole e spazi extra sono la norma.
  const tags = useMemo(
    () =>
      tagInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    [tagInput],
  );

  const hasFilters = Boolean(text || category || location || tags.length);

  useEffect(() => {
    let cancelled = false;
    // Debounce: senza, ogni tasto premuto sarebbe una query fatturata a Firestore.
    const timer = setTimeout(() => {
      const request = hasFilters
        ? searchProfiles({ text, category, tags, location: location || null })
        : listRecentProfiles();

      request
        .then((profiles) => {
          if (cancelled) return;
          // Con il database ancora vuoto mostriamo i finti, ma dichiarandolo.
          const isMock = profiles.length === 0 && process.env.NODE_ENV === "development";
          setResults({
            state: "ready",
            profiles: isMock ? filterMock(MOCK_PROFILES, { text, category, location, tags }) : profiles,
            isMock,
          });
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setResults({
            state: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, category, location, tags, hasFilters]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cerca per nome o @handle…"
          className="hairline w-full rounded-full bg-surface px-5 py-3.5 text-text placeholder:text-muted/70 focus:border-accent/50"
        />

        <div className="flex flex-wrap gap-3">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Tag: lo-fi, ritratto…"
            className="hairline min-w-45 flex-1 rounded-full bg-surface px-4 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent/50"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Città"
            className="hairline min-w-35 flex-1 rounded-full bg-surface px-4 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <CategoryChip active={category === null} onClick={() => setCategory(null)}>
            Tutte
          </CategoryChip>
          {CATEGORIES.map((option) => (
            <CategoryChip
              key={option}
              active={category === option}
              onClick={() => setCategory(category === option ? null : option)}
            >
              {option}
            </CategoryChip>
          ))}
        </div>
      </div>

      {results.state === "ready" && results.isMock && (
        <p className="hairline rounded-xl border-accent/30 bg-accent/8 px-4 py-3 text-sm text-accent">
          Nessun profilo nel database: stai vedendo <strong>dati di esempio</strong> per
          rifinire il layout. Spariranno da soli al primo profilo reale.
        </p>
      )}

      {results.state === "loading" && <SkeletonGrid />}

      {results.state === "error" && (
        <p className="hairline rounded-xl px-4 py-3 text-sm text-muted">
          Ricerca non riuscita: {results.message}
        </p>
      )}

      {results.state === "ready" &&
        (results.profiles.length === 0 ? (
          <div className="hairline rounded-2xl px-6 py-16 text-center">
            <p className="font-medium">Nessun profilo trovato</p>
            <p className="mt-1 text-sm text-muted">Prova con meno filtri o un altro termine.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.profiles.map((profile) => (
              <ProfileCard key={profile.uid} profile={profile} />
            ))}
          </div>
        ))}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent text-bg"
          : "hairline text-muted hover:border-accent/40 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="hairline h-44 animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
  );
}

/** Applica i filtri ai profili finti, così il layout si prova davvero. */
function filterMock(
  profiles: Profile[],
  filters: { text: string; category: Category | null; location: string; tags: string[] },
): Profile[] {
  const needle = filters.text.trim().toLowerCase();
  const city = filters.location.trim().toLowerCase();

  return profiles.filter((p) => {
    if (needle && !`${p.displayName} ${p.username}`.toLowerCase().includes(needle)) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (city && !(p.location ?? "").toLowerCase().includes(city)) return false;
    if (filters.tags.length && !filters.tags.some((t) => p.tags.some((pt) => pt.includes(t))))
      return false;
    return true;
  });
}
