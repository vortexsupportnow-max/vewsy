import Link from "next/link";

import { Avatar } from "./avatar";
import { PlatformIcon } from "./platform-icon";
import type { Profile } from "@/lib/types";

export function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <Link
      href={`/${profile.username}`}
      className="hairline group flex flex-col gap-4 rounded-2xl bg-surface p-5 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-3">
        <Avatar profile={profile} size={48} />
        <div className="min-w-0">
          <p className="truncate font-medium transition-colors group-hover:text-accent">
            {profile.displayName}
          </p>
          <p className="truncate text-sm text-muted">@{profile.username}</p>
        </div>
      </div>

      {profile.bio && <p className="line-clamp-2 text-sm text-muted">{profile.bio}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {profile.category && (
          <span className="rounded-full bg-accent/12 px-2.5 py-1 text-xs text-accent">
            {profile.category}
          </span>
        )}
        {profile.location && <span className="text-xs text-muted">{profile.location}</span>}
      </div>

      {profile.platforms.length > 0 && (
        <div className="flex items-center gap-2.5 text-muted">
          {profile.platforms.slice(0, 5).map((platform) => (
            <PlatformIcon key={platform} platform={platform} className="h-4 w-4" />
          ))}
        </div>
      )}
    </Link>
  );
}
