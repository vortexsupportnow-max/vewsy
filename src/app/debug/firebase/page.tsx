"use client";

import { useEffect, useState } from "react";
import { doc, getDocFromServer } from "firebase/firestore";

import { db, firebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import { GoogleButton } from "@/components/google-button";
import { useAuth } from "@/components/auth-provider";

type Status =
  | { state: "loading" }
  | { state: "ok"; detail: string }
  | { state: "error"; detail: string };

export default function FirebaseDebugPage() {
  // Lo stato "config mancante" è noto al primo render: calcolarlo qui invece che
  // in un setState dentro l'effetto evita un render sprecato.
  const [status, setStatus] = useState<Status>(() =>
    isFirebaseConfigured
      ? { state: "loading" }
      : {
          state: "error",
          detail: "Mancano una o più variabili NEXT_PUBLIC_FIREBASE_* in .env.local.",
        },
  );
  const { user, profile, error: authError } = useAuth();

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    // Una lettura basta a provare tutta la catena: chiavi, progetto, rete, regole.
    // Il documento può anche non esistere: conta che Firestore risponda senza errori.
    // `FromServer` è obbligatorio: `getDoc` ripiegherebbe sulla cache offline e
    // darebbe verde anche con il database non ancora creato.
    getDocFromServer(doc(db, "_healthcheck", "ping"))
      .then((snap) =>
        setStatus({
          state: "ok",
          detail: snap.exists()
            ? `Documento _healthcheck/ping letto: ${JSON.stringify(snap.data())}`
            : "Firestore ha risposto correttamente (il documento _healthcheck/ping non esiste ancora, va benissimo).",
        }),
      )
      .catch((error: unknown) => {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        setStatus({
          state: "error",
          detail:
            code === "unavailable"
              ? "Firestore irraggiungibile. Di solito significa che il database non è ancora stato creato: Console > Firestore Database > Crea database."
              : error instanceof Error
                ? `[${code}] ${error.message}`
                : String(error),
        });
      });
  }, []);

  const projectId = firebaseApp.options.projectId ?? "—";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8 font-sans">
      <div>
        <h1 className="text-2xl font-semibold">Diagnostica Firebase</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Pagina temporanea: eliminala quando il collegamento è confermato.
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-black/60 dark:text-white/60">Project ID</dt>
        <dd className="font-mono">{projectId}</dd>
        <dt className="text-black/60 dark:text-white/60">Config completa</dt>
        <dd className="font-mono">{isFirebaseConfigured ? "sì" : "no"}</dd>
      </dl>

      <div
        className={`rounded-lg border p-4 text-sm ${
          status.state === "ok"
            ? "border-green-600/40 bg-green-600/10"
            : status.state === "error"
              ? "border-red-600/40 bg-red-600/10"
              : "border-black/15 dark:border-white/15"
        }`}
      >
        <p className="font-medium">
          {status.state === "loading"
            ? "Connessione a Firestore…"
            : status.state === "ok"
              ? "Connesso a Firestore"
              : "Connessione fallita"}
        </p>
        {status.state !== "loading" && (
          <p className="mt-1 font-mono text-xs break-words">{status.detail}</p>
        )}
      </div>

      <section className="flex flex-col gap-3 border-t border-black/10 pt-6 dark:border-white/10">
        <h2 className="text-lg font-semibold">Accesso con Google</h2>
        <GoogleButton />
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-black/60 dark:text-white/60">uid</dt>
          <dd className="font-mono break-all">{user?.uid ?? "—"}</dd>
          <dt className="text-black/60 dark:text-white/60">Profilo Firestore</dt>
          <dd className="font-mono break-all">
            {profile ? `profiles/${profile.uid} → @${profile.username}` : "—"}
          </dd>
        </dl>
        {authError && <p className="font-mono text-xs text-red-600 dark:text-red-400">{authError}</p>}
      </section>
    </main>
  );
}
