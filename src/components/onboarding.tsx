"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AvatarUploader } from "./avatar-uploader";
import { useAuth } from "./auth-provider";
import { PLATFORM_LABELS, PlatformIcon } from "./platform-icon";
import { isUsernameAvailable, saveProfile } from "@/lib/profiles";
import { isReservedUsername } from "@/lib/reserved-usernames";
import { normalize } from "@/lib/search-tokens";
import {
  BIO_MAX_LENGTH,
  CATEGORIES,
  detectPlatform,
  type Category,
  type ProfileInput,
} from "@/lib/types";

const STEPS = ["Il tuo handle", "Cosa fai", "Il primo link"] as const;

export function Onboarding() {
  const { user, profile, loading, refresh } = useAuth();
  const router = useRouter();

  // Chi ha già completato il giro non deve rivederlo: l'onboarding è la porta
  // d'ingresso, non una pagina in cui si torna.
  useEffect(() => {
    if (!loading && profile?.onboardedAt) router.replace("/modifica");
    if (!loading && !user) router.replace("/accedi");
  }, [loading, profile, user, router]);

  if (loading) return <p className="text-muted">Caricamento…</p>;
  if (!user || !profile) return <p className="text-muted">Preparazione del profilo…</p>;
  if (profile.onboardedAt) return <p className="text-muted">Ci sei già, ti porto all&apos;editor…</p>;

  return (
    <Wizard
      uid={user.uid}
      initial={{
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        category: profile.category,
        tags: profile.tags,
        location: profile.location,
        links: profile.links,
      }}
      onDone={async () => {
        await refresh();
        router.push(`/${profile.username}`);
      }}
    />
  );
}

function Wizard({
  uid,
  initial,
  onDone,
}: {
  uid: string;
  initial: ProfileInput;
  onDone: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProfileInput>(initial);
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<ProfileInput>) => setForm({ ...form, ...patch });

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      const links = linkUrl.trim()
        ? [
            {
              id: crypto.randomUUID(),
              platform: detectPlatform(linkUrl),
              label: "",
              url: linkUrl.trim(),
              order: 0,
            },
          ]
        : form.links;

      await saveProfile(uid, { ...form, links }, { markOnboarded: true });
      await onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Progress step={step} />

      {step === 0 && (
        <HandleStep
          value={form.username}
          displayName={form.displayName}
          avatarUrl={form.avatarUrl}
          uid={uid}
          onChange={(patch) => update(patch)}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <CategoryStep
          form={form}
          onChange={update}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <LinkStep
          url={linkUrl}
          onChange={setLinkUrl}
          onBack={() => setStep(1)}
          onFinish={() => void finish()}
          busy={busy}
        />
      )}

      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------- passi */

function HandleStep({
  value,
  displayName,
  avatarUrl,
  uid,
  onChange,
  onNext,
}: {
  value: string;
  displayName: string;
  avatarUrl: string | null;
  uid: string;
  onChange: (patch: Partial<ProfileInput>) => void;
  onNext: () => void;
}) {
  const handle = normalize(value).replace(/\s/g, "");

  // Lunghezza e lista dei riservati si sanno subito: sono derivate dal render,
  // non stato. Solo la disponibilità richiede di chiedere a Firestore.
  const localIssue = handle.length < 3 ? "short" : isReservedUsername(handle) ? "reserved" : null;
  const [checked, setChecked] = useState<{ handle: string; free: boolean } | null>(null);

  // La verifica è a debounce: una lettura per tasto premuto sarebbe una lettura
  // fatturata per tasto premuto.
  useEffect(() => {
    if (localIssue) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      isUsernameAvailable(handle)
        .then((free) => !cancelled && setChecked({ handle, free }))
        .catch(() => undefined);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, localIssue]);

  // "Sto verificando" è la differenza fra l'handle scritto e quello verificato:
  // anche questo è derivabile, quindi non serve tenerlo in stato.
  const check =
    localIssue ?? (checked?.handle === handle ? (checked.free ? "free" : "taken") : "checking");
  const ok = check === "free";

  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Scegli il tuo handle"
        subtitle="È l'indirizzo che condividerai. Puoi cambiarlo anche dopo."
      />

      <AvatarUploader
        uid={uid}
        avatarUrl={avatarUrl}
        displayName={displayName}
        username={value}
        onChange={(url) => onChange({ avatarUrl: url })}
      />

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Nome visualizzato</span>
        <input
          value={displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Handle</span>
        <div className="hairline flex items-center gap-1 rounded-xl bg-surface px-4 focus-within:border-accent/50">
          <span className="text-muted">vewsy.app/</span>
          <input
            value={value}
            onChange={(e) => onChange({ username: e.target.value })}
            className="min-w-0 flex-1 bg-transparent py-3 outline-none"
            autoFocus
          />
        </div>
        <span className="text-xs text-muted">
          {check === "short" && "Servono almeno 3 caratteri."}
          {check === "checking" && "Verifico…"}
          {check === "free" && <span className="text-accent">Libero.</span>}
          {check === "taken" && "Già preso, provane un altro."}
          {check === "reserved" && "Questo handle è riservato dal sistema."}
        </span>
      </label>

      <Nav onNext={onNext} nextDisabled={!ok} />
    </div>
  );
}

function CategoryStep({
  form,
  onChange,
  onBack,
  onNext,
}: {
  form: ProfileInput;
  onChange: (patch: Partial<ProfileInput>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Cosa fai?"
        subtitle="Serve a farti trovare da chi cerca proprio quello."
      />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((option: Category) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange({ category: form.category === option ? null : option })}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              form.category === option
                ? "bg-accent text-bg"
                : "hairline text-muted hover:border-accent/40 hover:text-text"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Bio <span className="font-normal text-muted">{form.bio.length}/{BIO_MAX_LENGTH}</span>
        </span>
        <textarea
          value={form.bio}
          onChange={(e) => onChange({ bio: e.target.value.slice(0, BIO_MAX_LENGTH) })}
          rows={3}
          placeholder="Una riga su di te."
          className={`${inputClass} resize-none`}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Città <span className="font-normal text-muted">opzionale</span>
        </span>
        <input
          value={form.location ?? ""}
          onChange={(e) => onChange({ location: e.target.value || null })}
          className={inputClass}
        />
      </label>

      <Nav onBack={onBack} onNext={onNext} nextDisabled={!form.category} />
    </div>
  );
}

function LinkStep({
  url,
  onChange,
  onBack,
  onFinish,
  busy,
}: {
  url: string;
  onChange: (url: string) => void;
  onBack: () => void;
  onFinish: () => void;
  busy: boolean;
}) {
  const platform = url.trim() ? detectPlatform(url) : null;

  return (
    <div className="flex flex-col gap-5">
      <Heading
        title="Aggiungi il primo link"
        subtitle="Instagram, Twitch, Spotify… la piattaforma la riconosciamo noi."
      />

      <div className="hairline flex items-center gap-3 rounded-xl bg-surface px-4">
        {platform && (
          <span className="text-accent" title={PLATFORM_LABELS[platform]}>
            <PlatformIcon platform={platform} />
          </span>
        )}
        <input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://instagram.com/iltuonome"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-muted/70"
          autoFocus
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="hairline rounded-full px-5 py-2.5 text-sm text-muted transition-colors hover:text-text"
        >
          Indietro
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={busy}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Creo il profilo…" : "Pubblica il profilo"}
        </button>
        {!url.trim() && !busy && (
          <span className="text-xs text-muted">Puoi anche saltare e aggiungerli dopo.</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pezzini */

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col gap-1.5">
          <span className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-muted/20"}`} />
          <span className={`text-xs ${i === step ? "text-text" : "text-muted"}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function Nav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="hairline rounded-full px-5 py-2.5 text-sm text-muted transition-colors hover:text-text"
        >
          Indietro
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Continua
      </button>
    </div>
  );
}

const inputClass =
  "hairline w-full rounded-xl bg-surface px-4 py-3 text-text outline-none placeholder:text-muted/70 focus:border-accent/50";
