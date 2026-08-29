"use client";

import { useState } from "react";

import { signInWithGoogle } from "@/lib/auth";

export const GoogleMark = () => (
  <svg viewBox="0 0 48 48" aria-hidden className="h-5 w-5">
    <path
      fill="#EA4335"
      d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.7 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.6l7.8 6c1.9-5.6 7.2-9.6 13.6-10.1z"
    />
    <path
      fill="#4285F4"
      d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17.3z"
    />
    <path
      fill="#FBBC05"
      d="M10.4 28.4a14.5 14.5 0 0 1 0-8.8l-7.8-6a23.6 23.6 0 0 0 0 20.8l7.8-6z"
    />
    <path
      fill="#34A853"
      d="M24 47.5c6.2 0 11.5-2 15.4-5.6l-7.5-5.8c-2.1 1.4-4.8 2.2-7.9 2.2-6.4 0-11.7-4-13.6-9.9l-7.8 6C6.5 42.2 14.6 47.5 24 47.5z"
    />
  </svg>
);

/**
 * Unico punto in cui parte il popup Google. Il marchio è l'eccezione dichiarata
 * alla palette a cinque colori: le linee guida di Google vietano di ricolorarlo.
 */
export function GoogleButton({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      onDone?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => void run()}
        disabled={busy}
        className="hairline flex items-center justify-center gap-3 rounded-full bg-surface px-5 py-3 text-sm font-medium transition-colors hover:border-accent/40 disabled:opacity-50"
      >
        <GoogleMark />
        {busy ? "Apertura…" : "Continua con Google"}
      </button>
      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}
