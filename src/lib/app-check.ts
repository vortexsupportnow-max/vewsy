import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";

import { firebaseApp } from "./firebase";

let appCheck: AppCheck | null = null;

/**
 * Attiva App Check con reCAPTCHA v3.
 *
 * Serve a certificare che le richieste arrivino dalla tua app e non da uno
 * script: la API key sta nel bundle per forza, quindi senza App Check chiunque
 * può leggere l'intera directory pubblica o bruciarti la quota.
 *
 * Va chiamata SOLO nel browser: reCAPTCHA ha bisogno del DOM, e sul server
 * (rendering di /[username]) non esiste alcun token da generare.
 */
export function setupAppCheck(): void {
  if (typeof window === "undefined" || appCheck) return;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return; // Non configurato: l'app funziona lo stesso, senza protezione.

  // In sviluppo reCAPTCHA non può validare localhost: il token di debug si
  // registra una volta sola in Console > App Check > App > Gestisci token debug.
  if (process.env.NODE_ENV === "development") {
    const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
    (window as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken || true;
  }

  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    // Rinnova il token da solo prima della scadenza: senza, dopo un'ora di
    // sessione aperta le richieste iniziano a essere rifiutate.
    isTokenAutoRefreshEnabled: true,
  });
}
