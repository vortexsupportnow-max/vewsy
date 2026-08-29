/**
 * Riscrive `usernameNotReserved()` dentro firestore.rules partendo dalla lista
 * in src/lib/reserved-usernames.ts.
 *
 * Le regole Firestore non possono importare TypeScript, quindi la lista
 * esisterebbe in due posti — e due copie divergono sempre. Qui il TypeScript
 * resta l'unica fonte e le regole vengono generate.
 *
 *   node scripts/sync-reserved-usernames.mjs        verifica e riscrive
 *   node scripts/sync-reserved-usernames.mjs --check  fallisce se disallineate
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rulesPath = join(root, "firestore.rules");
const sourcePath = join(root, "src", "lib", "reserved-usernames.ts");

// Il file TS non è importabile da Node senza build: la lista si estrae dai
// letterali di stringa dei due array, che è tutto ciò che contiene.
const source = readFileSync(sourcePath, "utf8");
const arrays = source.match(/(?:const (?:ROUTES|RISERVATI)) = \[([\s\S]*?)\];/g) ?? [];
if (arrays.length !== 2) {
  throw new Error("Non trovo ROUTES e RISERVATI in reserved-usernames.ts");
}

const names = [
  ...new Set(arrays.flatMap((block) => [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]))),
].sort();

const generated = `
    // Generata da src/lib/reserved-usernames.ts — non modificare a mano:
    // rilancia "npm run rules:sync" dopo aver cambiato la lista.
    function usernameNotReserved() {
      return !(request.resource.data.username in [${names.map((n) => `'${n}'`).join(", ")}]);
    }`;

const rules = readFileSync(rulesPath, "utf8");
const marker = /\n\s*\/\/ Generata da src\/lib\/reserved-usernames\.ts[\s\S]*?function usernameNotReserved\(\) \{[\s\S]*?\n    \}/;

if (!marker.test(rules)) {
  throw new Error("Blocco usernameNotReserved() non trovato in firestore.rules");
}

const next = rules.replace(marker, generated);

if (process.argv.includes("--check")) {
  if (next !== rules) {
    console.error(`firestore.rules è disallineato: lancia "npm run rules:sync".`);
    process.exit(1);
  }
  console.log(`firestore.rules allineato (${names.length} handle riservati).`);
} else {
  writeFileSync(rulesPath, next);
  console.log(`firestore.rules aggiornato con ${names.length} handle riservati.`);
}
