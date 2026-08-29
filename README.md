# Vewsy

Un link per i tuoi social, e un motore per trovare gli altri.

Vewsy è a metà tra un Linktree e una directory di ricerca: ogni persona ha un
profilo pubblico con i propri link, e chiunque può cercare creator per
categoria, tag e città invece di sperare nell'algoritmo di qualcun altro.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind 4
- **Firebase**: Firestore per i dati, Authentication per l'accesso
- Deploy su Vercel

## Avvio in locale

```bash
npm install
cp .env.local.example .env.local   # poi riempi i valori (vedi sotto)
npm run dev
```

L'app risponde su http://localhost:3000.

> Nota: anche in locale l'app parla con il Firestore **di produzione**. Non
> esiste un database locale: le regole di sicurezza si applicano identiche.

### Variabili d'ambiente

I valori stanno in Console Firebase → ⚙️ Impostazioni progetto → *Le tue app* → Web.

| Variabile | Serve a |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | identificare il progetto |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | redirect del login |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | database di destinazione |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | file (non ancora usato) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | richiesto dall'SDK |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | identifica questa app web |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics (opzionale) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | App Check (opzionale) |
| `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` | App Check in sviluppo |

Sono tutte `NEXT_PUBLIC_`, quindi finiscono nel bundle del browser: è previsto.
A proteggere i dati sono le regole di sicurezza, non queste chiavi.

## Struttura

```
src/
  app/
    page.tsx              discovery: ricerca, filtri, griglia
    [username]/           profilo pubblico (SSR + ISR 60s, per la SEO)
    modifica/             editor del proprio profilo
    accedi/               login, registrazione, recupero password
    account/              email, password, metodi di accesso
  components/             interfaccia
  lib/
    firebase.ts           init SDK; `getFirebaseAuth()` è lazy di proposito
    auth.ts               accesso, verifica email, cambio credenziali, linking
    profiles.ts           lettura, ricerca e scrittura dei profili
    search-tokens.ts      indicizzazione a prefissi per la ricerca
    reserved-usernames.ts handle vietati (unica fonte di verità)
```

## Firestore

Due collection:

- **`profiles`** — un documento per utente, id = uid. Pubblicamente leggibile,
  scrivibile solo dal proprietario.
- **`usernames`** — un documento per handle, id = username. Garantisce
  l'unicità: viene scritto nella stessa transazione del profilo, così due
  persone non possono prendersi lo stesso handle.

### Ricerca

Firestore non ha ricerca full-text. I profili indicizzano i **prefissi** di
username, nome e tag in `searchTokens`, e la query usa `array-contains`.
Regge comodamente qualche migliaio di profili; oltre, si sostituisce con
Algolia o Typesense mantenendo la firma di `searchProfiles()`.

### Handle riservati

`src/lib/reserved-usernames.ts` è l'unica fonte. Le regole Firestore non
possono importare TypeScript, quindi la lista viene **generata**:

```bash
npm run rules:sync    # rigenera usernameNotReserved() in firestore.rules
npm run rules:check   # fallisce se le due sono disallineate
```

⚠️ Ogni nuova pagina di primo livello (`src/app/qualcosa/`) va aggiunta a
`ROUTES` in quel file. Le route statiche battono `[username]`: senza,
qualcuno può prendersi quell'handle e rendersi il profilo irraggiungibile.

### Pubblicare regole e indici

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

In alternativa le regole si incollano da Console → Firestore → Regole. Gli
indici, no: o CLI, o si creano uno alla volta seguendo il link che Firestore
stampa nell'errore alla prima query che ne ha bisogno.

## Deploy

1. Push su GitHub, poi *Import Project* su Vercel (riconosce Next.js da solo)
2. Ricopiare le variabili d'ambiente nelle impostazioni del progetto Vercel
3. **Console Firebase → Authentication → Settings → Domini autorizzati** →
   aggiungere il dominio Vercel, altrimenti il login Google fallisce con
   `auth/unauthorized-domain`

## App Check

Il codice è pronto in `src/lib/app-check.ts` e si attiva da solo quando
`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` è valorizzata.

⚠️ **Tenerlo in modalità monitoraggio, non enforcement.** La pagina
`/[username]` è renderizzata sul server con il client SDK, dove non esiste
alcun token App Check: forzando l'enforcement, ogni profilo pubblico
smetterebbe di caricare. Per arrivare a forzarlo va prima spostata quella
lettura sull'Admin SDK con un service account.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | build di produzione |
| `npm run lint` | ESLint |
| `npm run rules:sync` | rigenera gli handle riservati nelle regole |
| `npm run rules:check` | verifica che siano allineati |
