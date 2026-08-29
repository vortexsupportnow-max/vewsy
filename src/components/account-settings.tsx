"use client";

import Link from "next/link";
import { useState } from "react";
import type { User } from "firebase/auth";

import { useAuth } from "./auth-provider";
import { GoogleMark } from "./google-button";
import {
  changeEmail,
  changePassword,
  hasGoogle,
  hasPassword,
  linkGoogle,
  linkPassword,
  resendVerificationEmail,
} from "@/lib/auth";

export function AccountSettings() {
  const { user, loading, refresh } = useAuth();

  if (loading) return <p className="mt-8 text-muted">Caricamento…</p>;

  if (!user) {
    return (
      <p className="hairline mt-8 rounded-2xl px-5 py-8 text-center text-muted">
        <Link href="/accedi" className="text-accent underline-offset-4 hover:underline">
          Accedi
        </Link>{" "}
        per gestire il tuo account.
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      <VerificationCard user={user} onDone={refresh} />
      <EmailCard user={user} />
      <PasswordCard user={user} onDone={refresh} />
      <ProvidersCard user={user} onDone={refresh} />
    </div>
  );
}

/* ------------------------------------------------------------------- schede */

function VerificationCard({ user, onDone }: { user: User; onDone: () => Promise<void> }) {
  const action = useAction();

  // Chi entra con Google arriva già verificato da Google: mostrare un invito a
  // confermare sarebbe rumore, non sicurezza.
  if (user.emailVerified) {
    return (
      <Card title="Email verificata">
        <p className="text-sm text-muted">
          {user.email} è confermata.{" "}
          {hasGoogle(user) && !hasPassword(user) && "Verificata da Google all'accesso."}
        </p>
      </Card>
    );
  }

  return (
    <Card title="Email da confermare" accent>
      <p className="text-sm text-muted">
        Abbiamo inviato un link a <strong className="text-text">{user.email}</strong>. Finché
        non lo apri il profilo funziona, ma l&apos;indirizzo resta non verificato.
      </p>
      <Row>
        <Button
          onClick={() => action.run(async () => {
            await resendVerificationEmail();
            return "Link inviato di nuovo.";
          })}
          busy={action.busy}
        >
          Invia di nuovo
        </Button>
        <Button
          variant="ghost"
          onClick={() => action.run(async () => {
            await onDone();
            return "Stato aggiornato.";
          })}
          busy={action.busy}
        >
          Ho confermato, ricontrolla
        </Button>
      </Row>
      <Feedback {...action} />
    </Card>
  );
}

function EmailCard({ user }: { user: User }) {
  const action = useAction();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Card title="Cambia email">
      <p className="text-sm text-muted">
        Attuale: <span className="text-text">{user.email}</span>. La conferma arriva al
        <em> nuovo</em> indirizzo: il cambio avviene solo dopo che l&apos;hai aperta.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Nuova email"
        className={inputClass}
      />
      {hasPassword(user) && (
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password attuale"
          autoComplete="current-password"
          className={inputClass}
        />
      )}
      <Row>
        <Button
          onClick={() => action.run(async () => {
            await changeEmail(email, password || undefined);
            setEmail("");
            setPassword("");
            return "Controlla la casella del nuovo indirizzo per confermare.";
          })}
          busy={action.busy}
          disabled={!email}
        >
          Cambia email
        </Button>
        {!hasPassword(user) && (
          <span className="text-xs text-muted">Ti chiederemo di riautenticarti con Google.</span>
        )}
      </Row>
      <Feedback {...action} />
    </Card>
  );
}

function PasswordCard({ user, onDone }: { user: User; onDone: () => Promise<void> }) {
  const action = useAction();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const owns = hasPassword(user);

  return (
    <Card title={owns ? "Cambia password" : "Aggiungi una password"}>
      <p className="text-sm text-muted">
        {owns
          ? "Servono almeno 6 caratteri."
          : "Il tuo account usa solo Google. Aggiungendo una password potrai accedere anche senza."}
      </p>
      {owns && (
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Password attuale"
          autoComplete="current-password"
          className={inputClass}
        />
      )}
      <input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="Nuova password"
        autoComplete="new-password"
        minLength={6}
        className={inputClass}
      />
      <Row>
        <Button
          onClick={() => action.run(async () => {
            if (owns) {
              await changePassword(next, current);
            } else {
              await linkPassword(next);
              await onDone();
            }
            setCurrent("");
            setNext("");
            return owns ? "Password aggiornata." : "Password aggiunta all'account.";
          })}
          busy={action.busy}
          disabled={next.length < 6}
        >
          {owns ? "Aggiorna" : "Aggiungi"}
        </Button>
      </Row>
      <Feedback {...action} />
    </Card>
  );
}

function ProvidersCard({ user, onDone }: { user: User; onDone: () => Promise<void> }) {
  const action = useAction();

  return (
    <Card title="Metodi di accesso">
      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-3">
          <GoogleMark />
          <span className="flex-1">Google</span>
          <span className="text-muted">{hasGoogle(user) ? "collegato" : "non collegato"}</span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-5 w-5 items-center justify-center text-accent">@</span>
          <span className="flex-1">Email e password</span>
          <span className="text-muted">{hasPassword(user) ? "collegato" : "non collegato"}</span>
        </li>
      </ul>
      {!hasGoogle(user) && (
        <Row>
          <Button
            onClick={() => action.run(async () => {
              await linkGoogle();
              await onDone();
              return "Account Google collegato.";
            })}
            busy={action.busy}
          >
            Collega Google
          </Button>
        </Row>
      )}
      <Feedback {...action} />
    </Card>
  );
}

/* ------------------------------------------------------------------ pezzini */

/** Stato condiviso da ogni azione asincrona: occupato, errore, conferma. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      setDone(await task());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, done, run };
}

function Feedback({ error, done }: { error: string | null; done: string | null }) {
  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (done) return <p className="text-sm text-muted">{done}</p>;
  return null;
}

function Card({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`hairline flex flex-col gap-3 rounded-2xl bg-surface p-5 ${
        accent ? "border-accent/35" : ""
      }`}
    >
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function Button({
  onClick,
  busy,
  disabled,
  variant = "solid",
  children,
}: {
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  variant?: "solid" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={
        variant === "solid"
          ? "rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          : "hairline rounded-full px-5 py-2.5 text-sm text-muted transition-colors hover:text-text disabled:opacity-50"
      }
    >
      {busy ? "…" : children}
    </button>
  );
}

const inputClass =
  "hairline w-full rounded-xl bg-bg px-4 py-3 text-text outline-none placeholder:text-muted/70 focus:border-accent/50";
