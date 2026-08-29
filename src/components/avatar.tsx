import type { Profile } from "@/lib/types";

/** Iniziali su fondo accento: evita i buchi nel layout quando manca la foto. */
export function Avatar({
  profile,
  size = 48,
  className = "",
}: {
  profile: Pick<Profile, "displayName" | "username" | "avatarUrl">;
  size?: number;
  className?: string;
}) {
  const initials = (profile.displayName || profile.username)
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (profile.avatarUrl) {
    return (
      // Avatar da Google/host arbitrari: <img> nudo evita di dover elencare
      // ogni dominio in next.config per una foto da 48px.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-medium text-accent ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || "?"}
    </div>
  );
}
