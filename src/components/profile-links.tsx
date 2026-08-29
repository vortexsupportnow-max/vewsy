"use client";

import { useEffect } from "react";

import { PLATFORM_LABELS, PlatformIcon } from "./platform-icon";
import { recordLinkClick, recordProfileView } from "@/lib/stats";
import type { SocialLink } from "@/lib/types";

/**
 * I link vivono in un componente client per due motivi: registrare la visita e
 * contare i click. La pagina profilo resta un server component, così l'HTML per
 * Google continua ad arrivare già pronto.
 */
export function ProfileLinks({ uid, links }: { uid: string; links: SocialLink[] }) {
  useEffect(() => {
    void recordProfileView(uid);
  }, [uid]);

  if (links.length === 0) {
    return (
      <p className="hairline rounded-2xl px-5 py-8 text-center text-sm text-muted">
        Questo profilo non ha ancora link.
      </p>
    );
  }

  return (
    <>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer me"
          // `void` e nessun await: la navigazione non deve aspettare Firestore.
          // Se la scrittura fallisce o è lenta, il link si apre comunque.
          onClick={() => void recordLinkClick(uid, link.id)}
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
    </>
  );
}
