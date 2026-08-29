import type { Profile } from "./types";

/**
 * Profili finti usati SOLO in sviluppo e SOLO quando Firestore non restituisce
 * nulla, per poter rifinire il layout con il database ancora vuoto.
 * L'interfaccia lo dichiara sempre in modo visibile: non devono mai passare
 * per dati reali.
 */
function mock(
  partial: Pick<Profile, "username" | "displayName" | "bio" | "category" | "tags" | "location"> &
    Partial<Profile>,
): Profile {
  return {
    uid: `mock-${partial.username}`,
    avatarUrl: null,
    locationKey: partial.location?.toLowerCase() ?? null,
    links: [],
    platforms: [],
    searchTokens: [],
    verified: false,
    onboardedAt: null,
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

export const MOCK_PROFILES: Profile[] = [
  mock({
    username: "novaframe",
    displayName: "Nova Frame",
    bio: "Video editor. Monto cose che si guardano due volte.",
    category: "Video Editor",
    tags: ["montaggio", "color grading", "documentari"],
    location: "Milano",
    platforms: ["youtube", "instagram"],
  }),
  mock({
    username: "kaimusic",
    displayName: "Kai",
    bio: "Producer lo-fi e hip-hop. Beat ogni venerdì.",
    category: "Producer",
    tags: ["lo-fi", "hip-hop", "beatmaking"],
    location: "Bologna",
    platforms: ["spotify", "soundcloud", "youtube"],
  }),
  mock({
    username: "elenaplays",
    displayName: "Elena Plays",
    bio: "Streamer. Soulslike, rage e pazienza in dosi variabili.",
    category: "Streamer",
    tags: ["soulslike", "speedrun", "chill"],
    location: "Roma",
    platforms: ["twitch", "tiktok", "discord"],
  }),
  mock({
    username: "marlow",
    displayName: "Marlow",
    bio: "Illustratore. Inchiostro, mostri gentili, copertine.",
    category: "Illustratore",
    tags: ["ink", "fantasy", "character design"],
    location: "Torino",
    platforms: ["artstation", "instagram", "patreon"],
  }),
  mock({
    username: "sararaw",
    displayName: "Sara Raw",
    bio: "Fotografa analogica. Pellicola scaduta e luce difficile.",
    category: "Fotografo",
    tags: ["analogico", "ritratto", "street"],
    location: "Napoli",
    platforms: ["instagram", "website"],
  }),
  mock({
    username: "radioderiva",
    displayName: "Radio Deriva",
    bio: "Podcast su storie che nessuno ha chiesto. Ogni martedì.",
    category: "Podcaster",
    tags: ["narrativa", "interviste", "true crime"],
    location: "Firenze",
    platforms: ["spotify", "youtube"],
  }),
];
