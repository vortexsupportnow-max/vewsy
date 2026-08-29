/**
 * Firestore non ha ricerca full-text: si indicizzano a mano i prefissi delle parole
 * e si interroga con `array-contains`. Va benissimo fino a qualche migliaio di profili;
 * oltre, si passa ad Algolia/Typesense tenendo la stessa forma di query.
 */

const MIN_PREFIX = 2;
const MAX_PREFIX = 12;

/** "Marco Rossi" -> ["ma","mar","marc","marco","ro","ros","ross","rossi"] */
export function buildSearchTokens(...sources: (string | string[] | undefined)[]): string[] {
  const tokens = new Set<string>();

  for (const source of sources) {
    if (!source) continue;
    const parts = Array.isArray(source) ? source : [source];

    for (const part of parts) {
      for (const word of normalize(part).split(" ")) {
        if (word.length < MIN_PREFIX) continue;
        const limit = Math.min(word.length, MAX_PREFIX);
        for (let i = MIN_PREFIX; i <= limit; i++) tokens.add(word.slice(0, i));
      }
    }
  }

  return [...tokens];
}

/** Minuscolo, senza accenti e senza punteggiatura: query e indice devono coincidere. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trasforma il testo digitato dall'utente nel token da cercare. */
export function toSearchToken(query: string): string {
  const first = normalize(query).split(" ")[0] ?? "";
  return first.slice(0, MAX_PREFIX);
}
