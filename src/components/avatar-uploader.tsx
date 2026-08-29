"use client";

import { useRef, useState } from "react";

import { Avatar } from "./avatar";
import { ACCEPTED_IMAGE_TYPES, uploadAvatar } from "@/lib/storage";

export function AvatarUploader({
  uid,
  avatarUrl,
  displayName,
  username,
  onChange,
}: {
  uid: string;
  avatarUrl: string | null;
  displayName: string;
  username: string;
  onChange: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // L'URL torna con un token di Storage: cambia a ogni caricamento, quindi
      // la cache del browser non serve la foto vecchia.
      onChange(await uploadAvatar(uid, file));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Foto profilo</span>

      <div className="flex items-center gap-4">
        <Avatar profile={{ avatarUrl, displayName, username }} size={72} />

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="hairline rounded-full px-4 py-2 text-sm transition-colors hover:border-accent/40 disabled:opacity-50"
            >
              {busy ? "Caricamento…" : avatarUrl ? "Cambia foto" : "Carica una foto"}
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={busy}
                className="px-2 text-sm text-muted transition-colors hover:text-accent disabled:opacity-50"
              >
                Rimuovi
              </button>
            )}
          </div>

          <p className="text-xs text-muted">
            JPG, PNG o WebP. Viene ritagliata al centro e ridotta a 512px.
          </p>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={(e) => void pick(e.target.files?.[0])}
        className="hidden"
      />

      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}
