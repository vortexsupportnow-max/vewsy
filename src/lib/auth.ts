import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";

import { getFirebaseAuth } from "./firebase";

function googleProvider() {
  const provider = new GoogleAuthProvider();
  // Mostra sempre il selettore account: senza, chi ha più account Google resta
  // incastrato sul primo e non capisce perché.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export class AuthActionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthActionError";
  }
}

/* ------------------------------------------------------------------ accesso */

export async function signInWithGoogle(): Promise<User> {
  try {
    const credential = await signInWithPopup(getFirebaseAuth(), googleProvider());
    return credential.user;
  } catch (error) {
    throw translate(error);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return credential.user;
  } catch (error) {
    throw translate(error);
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName?.trim()) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    }
    // Parte subito: l'utente è già dentro, ma la mail va confermata.
    await sendEmailVerification(credential.user);
    return credential.user;
  } catch (error) {
    throw translate(error);
  }
}

export function signOutUser(): Promise<void> {
  return signOut(getFirebaseAuth());
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/* -------------------------------------------------------------------- email */

export async function resendVerificationEmail(): Promise<void> {
  const user = requireUser();
  try {
    await sendEmailVerification(user);
  } catch (error) {
    throw translate(error);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  } catch (error) {
    throw translate(error);
  }
}

/**
 * Cambia l'indirizzo email.
 *
 * Usa `verifyBeforeUpdateEmail`, non `updateEmail`: manda una conferma al nuovo
 * indirizzo e cambia l'email solo dopo il click. Con `updateEmail` un refuso
 * lascerebbe l'account agganciato a una casella inesistente, senza modo di
 * recuperarlo.
 */
export async function changeEmail(newEmail: string, currentPassword?: string): Promise<void> {
  const user = requireUser();
  await reauthenticate(user, currentPassword);
  try {
    await verifyBeforeUpdateEmail(user, newEmail);
  } catch (error) {
    throw translate(error);
  }
}

export async function changePassword(
  newPassword: string,
  currentPassword?: string,
): Promise<void> {
  const user = requireUser();
  await reauthenticate(user, currentPassword);
  try {
    await updatePassword(user, newPassword);
  } catch (error) {
    throw translate(error);
  }
}

/* ---------------------------------------------------- collegamento provider */

export function providerIds(user: User): string[] {
  return user.providerData.map((p) => p.providerId);
}

export function hasPassword(user: User): boolean {
  return providerIds(user).includes("password");
}

export function hasGoogle(user: User): boolean {
  return providerIds(user).includes("google.com");
}

/** Aggiunge una password a un account nato con Google (e viceversa sotto). */
export async function linkPassword(password: string): Promise<void> {
  const user = requireUser();
  if (!user.email) throw new AuthActionError("no-email", "L'account non ha un'email associata.");
  try {
    await linkWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } catch (error) {
    throw translate(error);
  }
}

export async function linkGoogle(): Promise<void> {
  const user = requireUser();
  try {
    await linkWithPopup(user, googleProvider());
  } catch (error) {
    throw translate(error);
  }
}

/* ----------------------------------------------------------------- interni */

function requireUser(): User {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new AuthActionError("no-session", "Devi essere connesso.");
  return user;
}

/**
 * Le operazioni sensibili scadono: Firebase pretende un accesso recente. Si
 * ri-autentica con lo stesso metodo con cui l'utente è entrato, così chi usa
 * solo Google non si vede chiedere una password che non ha mai creato.
 */
async function reauthenticate(user: User, currentPassword?: string): Promise<void> {
  try {
    if (currentPassword && user.email && hasPassword(user)) {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, currentPassword),
      );
      return;
    }
    if (hasGoogle(user)) {
      await reauthenticateWithPopup(user, googleProvider());
      return;
    }
    throw new AuthActionError("reauth-required", "Inserisci la password attuale per continuare.");
  } catch (error) {
    if (error instanceof AuthActionError) throw error;
    throw translate(error);
  }
}

/** Traduce i codici Firebase nei messaggi che l'interfaccia mostra davvero. */
function translate(error: unknown): AuthActionError {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  const messages: Record<string, string> = {
    "auth/popup-closed-by-user": "Accesso annullato.",
    "auth/cancelled-popup-request": "Accesso annullato.",
    "auth/popup-blocked": "Il browser ha bloccato il popup: consentilo e riprova.",
    "auth/operation-not-allowed":
      "Metodo di accesso non abilitato: Console Firebase > Authentication > Sign-in method.",
    "auth/unauthorized-domain":
      "Dominio non autorizzato: aggiungilo in Authentication > Settings > Domini autorizzati.",
    "auth/invalid-email": "Indirizzo email non valido.",
    "auth/missing-password": "Inserisci la password.",
    "auth/weak-password": "Password troppo debole: servono almeno 6 caratteri.",
    "auth/email-already-in-use": "Esiste già un account con questa email.",
    "auth/invalid-credential": "Email o password non corretti.",
    "auth/user-not-found": "Nessun account con questa email.",
    "auth/wrong-password": "Password non corretta.",
    "auth/too-many-requests": "Troppi tentativi: riprova tra qualche minuto.",
    "auth/requires-recent-login": "Per sicurezza devi accedere di nuovo prima di questa modifica.",
    "auth/credential-already-in-use": "Queste credenziali sono già legate a un altro account.",
    "auth/provider-already-linked": "Questo metodo di accesso è già collegato.",
    "auth/account-exists-with-different-credential":
      "Esiste già un account con questa email, creato con un altro metodo. Accedi con quello e collega il secondo dalle impostazioni.",
    "auth/network-request-failed": "Rete non raggiungibile: controlla la connessione.",
  };

  return new AuthActionError(
    code || "unknown",
    messages[code] ?? (error instanceof Error ? error.message : "Operazione non riuscita."),
  );
}
