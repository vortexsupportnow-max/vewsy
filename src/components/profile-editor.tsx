"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "./auth-provider";
import { PLATFORM_LABELS, PlatformIcon } from "./platform-icon";
import { saveProfile } from "@/lib/profiles";
import {
  BIO_MAX_LENGTH,
  CATEGORIES,
  detectPlatform,
  type Profile,
  type ProfileInput,
  type SocialLink,
} from "@/lib/types";

type SaveState =
  | { state: "idle" | "saving" | "saved" }
  | { state: "error"; message: string };

/**
 * Fa solo da guardia: il form vero si monta quando il profilo c'è già, così può
 * inizializzare il proprio stato una volta sola invece di rincorrere il caricamento
 * con un effetto (che sovrascriverebbe quello che l'utente sta scrivendo).
 */
export function ProfileEditor() {
  const { user, profile, loading } = useAuth();

  if (loading) return <p className="mt-8 text-muted">Caricamento…</p>;

  if (!user) {
    return (
      <p className="hairline mt-8 rounded-2xl px-5 py-8 text-center text-muted">
        Accedi per modificare il tuo profilo.
      </p>
    );
  }

  if (!profile) return <p className="mt-8 text-muted">Preparazione del profilo…</p>;

  return <ProfileForm key={profile.uid} uid={user.uid} profile={profile} />;
}

function ProfileForm({ uid, profile }: { uid: string; profile: Profile }) {
  const [form, setForm] = useState<ProfileInput>(() => ({
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    category: profile.category,
    tags: profile.tags,
    location: profile.location,
    links: profile.links,
  }));
  const [save, setSave] = useState<SaveState>({ state: "idle" });

  const update = (patch: Partial<ProfileInput>) => {
    setForm({ ...form, ...patch });
    setSave({ state: "idle" });
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSave({ state: "saving" });
    try {
      await saveProfile(uid, form);
      setSave({ state: "saved" });
    } catch (error: unknown) {
      setSave({
        state: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-6">
      <Field label="Handle" hint={`vewsy.app/${form.username || "…"}`}>
        <input
          value={form.username}
          onChange={(e) => update({ username: e.target.value })}
          required
          minLength={3}
          className={inputClass}
        />
      </Field>

      <Field label="Nome visualizzato">
        <input
          value={form.displayName}
          onChange={(e) => update({ displayName: e.target.value })}
          className={inputClass}
        />
      </Field>

      <Field label="Bio" hint={`${form.bio.length}/${BIO_MAX_LENGTH}`}>
        <textarea
          value={form.bio}
          onChange={(e) => update({ bio: e.target.value.slice(0, BIO_MAX_LENGTH) })}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </Field>

      <Field label="Categoria principale">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update({ category: form.category === option ? null : option })}
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
      </Field>

      <Field label="Tag secondari" hint="separati da virgola">
        <input
          value={form.tags.join(", ")}
          onChange={(e) =>
            update({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          placeholder="lo-fi, hip-hop, beatmaking"
          className={inputClass}
        />
      </Field>

      <Field label="Città" hint="opzionale">
        <input
          value={form.location ?? ""}
          onChange={(e) => update({ location: e.target.value || null })}
          className={inputClass}
        />
      </Field>

      <LinksEditor links={form.links} onChange={(links) => update({ links })} />

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={save.state === "saving"}
          className="rounded-full bg-accent px-6 py-3 font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {save.state === "saving" ? "Salvataggio…" : "Salva"}
        </button>

        {save.state === "saved" && (
          <p className="text-sm text-muted">
            Salvato.{" "}
            <Link
              href={`/${form.username}`}
              className="text-accent underline-offset-4 hover:underline"
            >
              Vedi il profilo
            </Link>
          </p>
        )}
        {save.state === "error" && <p className="text-sm text-accent">{save.message}</p>}
      </div>
    </form>
  );
}

function LinksEditor({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  const setLink = (index: number, patch: Partial<SocialLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((link, i) => ({ ...link, order: i })));
  };

  return (
    <Field label="Link">
      <div className="flex flex-col gap-3">
        {links.map((link, index) => (
          <div key={link.id} className="hairline flex items-center gap-3 rounded-xl bg-surface p-3">
            <span className="text-accent" title={PLATFORM_LABELS[link.platform]}>
              <PlatformIcon platform={link.platform} />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input
                value={link.label}
                onChange={(e) => setLink(index, { label: e.target.value })}
                placeholder={PLATFORM_LABELS[link.platform]}
                className="bg-transparent text-sm outline-none placeholder:text-muted/70"
              />
              <input
                value={link.url}
                // La piattaforma si ricava dall'URL a ogni modifica: l'icona segue
                // quello che l'utente incolla, senza doverglielo chiedere.
                onChange={(e) =>
                  setLink(index, {
                    url: e.target.value,
                    platform: detectPlatform(e.target.value),
                  })
                }
                placeholder="https://…"
                className="bg-transparent text-sm text-muted outline-none placeholder:text-muted/70"
              />
            </div>

            <div className="flex flex-col">
              <IconButton label="Sposta su" onClick={() => move(index, -1)}>
                ↑
              </IconButton>
              <IconButton label="Sposta giù" onClick={() => move(index, 1)}>
                ↓
              </IconButton>
            </div>
            <IconButton
              label="Rimuovi"
              onClick={() => onChange(links.filter((_, i) => i !== index))}
            >
              ×
            </IconButton>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            onChange([
              ...links,
              {
                id: crypto.randomUUID(),
                platform: "website",
                label: "",
                url: "",
                order: links.length,
              },
            ])
          }
          className="hairline rounded-xl px-4 py-3 text-sm text-muted transition-colors hover:border-accent/40 hover:text-text"
        >
          + Aggiungi link
        </button>
      </div>
    </Field>
  );
}

const inputClass =
  "hairline w-full rounded-xl bg-surface px-4 py-3 text-text outline-none placeholder:text-muted/70 focus:border-accent/50";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="px-2 text-muted transition-colors hover:text-accent"
    >
      {children}
    </button>
  );
}
