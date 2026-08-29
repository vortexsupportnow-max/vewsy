import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Avatar } from "@/components/avatar";
import { PLATFORM_LABELS, PlatformIcon } from "@/components/platform-icon";
import { SiteHeader } from "@/components/site-header";
import { getProfileByUsername } from "@/lib/profiles";

// I profili cambiano di rado ma devono poter comparire subito: rigenerazione
// ogni minuto invece di build statica o SSR a ogni visita.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Profilo non trovato — Vewsy" };

  return {
    title: `${profile.displayName} (@${profile.username}) — Vewsy`,
    description: profile.bio || `Tutti i link di ${profile.displayName} su Vewsy.`,
  };
}

export default async function ProfilePage({ params }: PageProps<"/[username]">) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
        <div className="flex flex-col items-center text-center">
          <Avatar profile={profile} size={96} />
          <h1 className="mt-5 text-2xl font-semibold">{profile.displayName}</h1>
          <p className="text-muted">@{profile.username}</p>

          {profile.bio && <p className="mt-4 max-w-md text-muted">{profile.bio}</p>}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {profile.category && (
              <span className="rounded-full bg-accent/12 px-3 py-1 text-sm text-accent">
                {profile.category}
              </span>
            )}
            {profile.tags.map((tag) => (
              <span key={tag} className="hairline rounded-full px-3 py-1 text-sm text-muted">
                {tag}
              </span>
            ))}
          </div>

          {profile.location && <p className="mt-4 text-sm text-muted">{profile.location}</p>}
        </div>

        <div className="mt-10 flex flex-col gap-3">
          {profile.links.length === 0 && (
            <p className="hairline rounded-2xl px-5 py-8 text-center text-sm text-muted">
              Questo profilo non ha ancora link.
            </p>
          )}

          {profile.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer me"
              className="hairline flex items-center gap-4 rounded-2xl bg-surface px-5 py-4 transition-colors hover:border-accent/40"
            >
              <span className="text-accent">
                <PlatformIcon platform={link.platform} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {link.label || PLATFORM_LABELS[link.platform]}
                </span>
                <span className="block truncate text-sm text-muted">{link.url}</span>
              </span>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
