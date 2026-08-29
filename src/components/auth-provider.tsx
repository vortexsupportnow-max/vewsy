"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";

import { signOutUser, watchAuthState } from "@/lib/auth";
import { setupAppCheck } from "@/lib/app-check";
import { ensureProfile } from "@/lib/profiles";
import type { Profile } from "@/lib/types";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  /** True finché non sappiamo se c'è una sessione: evita di sfarfallare il login. */
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  /** Ricarica utente e profilo dopo una modifica (verifica email, cambio dati). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prima di ogni chiamata a Firestore, così le richieste nascono già firmate.
    setupAppCheck();

    // Un solo listener per tutta l'app: Firebase ripristina da solo la sessione
    // salvata, quindi al reload questo scatta senza bisogno di rifare il login.
    return watchAuthState((nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      ensureProfile(nextUser)
        .then(setProfile)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoading(false));
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      error,
      signOut: async () => {
        setError(null);
        await signOutUser();
      },
      refresh: async () => {
        const current = user;
        if (!current) return;
        // `emailVerified` è dentro il token: senza reload resta al valore che
        // aveva all'accesso, e la conferma appena fatta non si vedrebbe.
        await current.reload();
        setUser({ ...current } as User);
        setProfile(await ensureProfile(current));
      },
    }),
    [user, profile, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth va usato dentro <AuthProvider>.");
  return context;
}
