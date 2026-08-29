import type { Timestamp } from "firebase/firestore";

/** Piattaforme riconosciute: guidano l'icona automatica sui link. */
export const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "twitch",
  "spotify",
  "soundcloud",
  "x",
  "discord",
  "behance",
  "artstation",
  "bandcamp",
  "patreon",
  "website",
] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Categoria principale: una sola per profilo, è l'asse portante della discovery. */
export const CATEGORIES = [
  "Streamer",
  "Musicista/Cantautore",
  "Producer",
  "Graphic Designer",
  "Fotografo",
  "Video Editor",
  "Illustratore",
  "Gamer/Esports",
  "Podcaster",
  "Artista Digitale",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const BIO_MAX_LENGTH = 150;

export type SocialLink = {
  id: string;
  /** Derivata dall'URL in scrittura, non chiesta all'utente. */
  platform: Platform;
  label: string;
  url: string;
  order: number;
};

/** Documento della collection `profiles`. L'id del documento è l'uid dell'utente. */
export type Profile = {
  uid: string;
  /** Handle pubblico in minuscolo: vewsy.app/<username>. Univoco. */
  username: string;
  displayName: string;
  /** Massimo BIO_MAX_LENGTH caratteri. */
  bio: string;
  avatarUrl: string | null;
  category: Category | null;
  /** Tag secondari liberi, in minuscolo (es. "hip-hop", "lo-fi"). */
  tags: string[];
  /** Città come digitata dall'utente; opzionale. */
  location: string | null;
  /** Versione normalizzata di `location`: è su questa che filtra la ricerca. */
  locationKey: string | null;
  links: SocialLink[];
  /** Derivato da `links`: abilita "mostrami chi sta su Twitch". */
  platforms: Platform[];
  /** Prefissi generati da username, displayName e tags per la ricerca testuale. */
  searchTokens: string[];
  verified: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

/** I campi che l'utente compila davvero: il resto è derivato in scrittura. */
export type ProfileInput = Pick<
  Profile,
  | "username"
  | "displayName"
  | "bio"
  | "avatarUrl"
  | "category"
  | "tags"
  | "location"
  | "links"
>;

/** Riconosce la piattaforma dall'URL, così l'utente incolla e basta. */
export function detectPlatform(url: string): Platform {
  let host: string;
  try {
    host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return "website";
  }

  const matchers: [Platform, RegExp][] = [
    ["instagram", /(^|\.)instagram\.com$/],
    ["tiktok", /(^|\.)tiktok\.com$/],
    ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/],
    ["twitch", /(^|\.)twitch\.tv$/],
    ["spotify", /(^|\.)spotify\.com$/],
    ["soundcloud", /(^|\.)soundcloud\.com$/],
    ["x", /(^|\.)(x\.com|twitter\.com)$/],
    ["discord", /(^|\.)(discord\.gg|discord\.com)$/],
    ["behance", /(^|\.)behance\.net$/],
    ["artstation", /(^|\.)artstation\.com$/],
    ["bandcamp", /(^|\.)bandcamp\.com$/],
    ["patreon", /(^|\.)patreon\.com$/],
  ];

  return matchers.find(([, pattern]) => pattern.test(host))?.[0] ?? "website";
}
