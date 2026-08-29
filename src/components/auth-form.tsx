"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleButton } from "./google-button";
import { sendPasswordReset, signInWithEmail, signUpWithEmail } from "@/lib/auth";

type Mode = "accedi" | "registrati" | "recupera";

const TITLES: Record<Mode, { title: string; cta: string }> = {
  accedi: { title: "Bentornato", cta: "Accedi" },
  registrati: { title: "Crea il tuo profilo", cta: "Registrati" },
  recupera: { title: "Recupera la password", cta: "Invia il link" },
};

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("accedi");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "recupera") {
        await sendPasswordReset(email);
        setNotice(`Se esiste un account per ${email}, il link di recupero è partito.`);
      } else if (mode === "registrati") {
        await signUpWithEmail(email, password, displayName);
        router.push("/modifica");
      } else {
        await signInWithEmail(email, password);
        router.push("/modifica");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{TITLES[mode].title}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "registrati"
            ? "Un handle, i tuoi link, e sei trovabile."
            : mode === "recupera"
              ? "Ti mandiamo un link per impostarne una nuova."
              : "Accedi per gestire il tuo profilo Vewsy."}
        </p>
      </div>

      {mode !== "recupera" && (
        <>
          <GoogleButton onDone={() => router.push("/modifica")} />
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-muted/20" />
            oppure
            <span className="h-px flex-1 bg-muted/20" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "registrati" && (
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Come ti chiami"
            autoComplete="name"
            className={inputClass}
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          className={inputClass}
        />

        {mode !== "recupera" && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            autoComplete={mode === "registrati" ? "new-password" : "current-password"}
            className={inputClass}
          />
        )}

        {error && <p className="text-sm text-accent">{error}</p>}
        {notice && <p className="text-sm text-muted">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-accent px-6 py-3 font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Un attimo…" : TITLES[mode].cta}
        </button>
      </form>

      <div className="flex flex-wrap justify-between gap-3 text-sm text-muted">
        {mode !== "accedi" && (
          <button onClick={() => switchTo("accedi")} className="hover:text-text">
            Ho già un account
          </button>
        )}
        {mode !== "registrati" && (
          <button onClick={() => switchTo("registrati")} className="hover:text-text">
            Crea un account
          </button>
        )}
        {mode !== "recupera" && (
          <button onClick={() => switchTo("recupera")} className="hover:text-text">
            Password dimenticata
          </button>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "hairline w-full rounded-xl bg-surface px-4 py-3 text-text outline-none placeholder:text-muted/70 focus:border-accent/50";
