/**
 * Handle che nessuno può rivendicare.
 *
 * Il motivo tecnico: /[username] è una route dinamica, e Next.js dà la
 * precedenza a quelle statiche. Un utente con handle "modifica" avrebbe il
 * profilo irraggiungibile — e l'handle risulterebbe comunque occupato nel
 * registro. Ogni volta che aggiungi una pagina di primo livello, il suo nome
 * va aggiunto qui E in firestore.rules.
 */
const ROUTES = ["modifica", "debug", "accedi", "account", "registrati", "api"];

/** Nomi che non vuoi far impersonare, o che ti servirai in futuro. */
const RISERVATI = [
  "admin",
  "administrator",
  "vewsy",
  "support",
  "supporto",
  "staff",
  "help",
  "aiuto",
  "info",
  "contatti",
  "about",
  "chi-siamo",
  "privacy",
  "termini",
  "terms",
  "legal",
  "settings",
  "impostazioni",
  "login",
  "logout",
  "signup",
  "signin",
  "register",
  "search",
  "cerca",
  "esplora",
  "explore",
  "profilo",
  "profile",
  "user",
  "utente",
  "me",
  "new",
  "nuovo",
  "null",
  "undefined",
  "static",
  "_next",
  "favicon",
  "robots",
  "sitemap",
];

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([...ROUTES, ...RISERVATI]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

/** Serializzata nelle regole Firestore, che non possono importare TypeScript. */
export function reservedUsernamesForRules(): string {
  return [...RESERVED_USERNAMES].sort().map((u) => `'${u}'`).join(", ");
}
