import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "./firebase";
import { isReservedUsername } from "./reserved-usernames";
import { buildSearchTokens, normalize, toSearchToken } from "./search-tokens";
import { BIO_MAX_LENGTH, type Category, type Profile, type ProfileInput } from "./types";

const PROFILES = "profiles";
/** Un documento per username (id = username) per garantire l'unicità dell'handle. */
const USERNAMES = "usernames";

const profileConverter = {
  toFirestore: (profile: Profile) => profile,
  fromFirestore: (snap: QueryDocumentSnapshot) => ({ ...snap.data(), uid: snap.id }) as Profile,
};

const profilesRef = collection(db, PROFILES).withConverter(profileConverter);

export async function getProfileByUid(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(profilesRef, uid));
  return snap.exists() ? snap.data() : null;
}

/** Lookup per la pagina pubblica /[username]. */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const snap = await getDocs(
    query(profilesRef, where("username", "==", normalize(username)), limitTo(1)),
  );
  return snap.empty ? null : snap.docs[0].data();
}

export type SearchFilters = {
  /** Testo digitato: cerca per prefisso su username, nome e tag. */
  text?: string;
  category?: Category | null;
  tags?: string[];
  location?: string | null;
  max?: number;
};

/**
 * Firestore ammette una sola operazione su array per query. Il testo si prende
 * quello slot (`array-contains` sui prefissi), mentre categoria e località sono
 * uguaglianze e viaggiano insieme senza conflitti. I tag restano quindi filtrati
 * in memoria quando c'è del testo, e vanno a database quando non ce n'è.
 */
export async function searchProfiles({
  text,
  category = null,
  tags = [],
  location = null,
  max = 40,
}: SearchFilters): Promise<Profile[]> {
  const token = text ? toSearchToken(text) : "";
  const locationKey = location ? normalize(location) : "";
  const constraints: QueryConstraint[] = [];

  if (token) {
    constraints.push(where("searchTokens", "array-contains", token));
  } else if (tags.length) {
    constraints.push(where("tags", "array-contains-any", tags.map(normalize).slice(0, 10)));
  }

  if (category) constraints.push(where("category", "==", category));
  if (locationKey) constraints.push(where("locationKey", "==", locationKey));

  // Sovra-campiona quando c'è un filtro da applicare in memoria, per non
  // restituire mezza pagina dopo lo scarto.
  const needsClientFilter = Boolean(token && tags.length);
  constraints.push(orderBy("username"), limitTo(needsClientFilter ? max * 4 : max));

  const snap = await getDocs(query(profilesRef, ...constraints));
  let results = snap.docs.map((d) => d.data());

  if (needsClientFilter) {
    const wanted = tags.map(normalize);
    results = results.filter((p) => wanted.some((t) => p.tags.includes(t)));
  }

  return results.slice(0, max);
}

/** Ultimi profili aggiornati: è ciò che vede chi apre la discovery senza filtri. */
export async function listRecentProfiles(max = 24): Promise<Profile[]> {
  const snap = await getDocs(query(profilesRef, orderBy("updatedAt", "desc"), limitTo(max)));
  return snap.docs.map((d) => d.data());
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, USERNAMES, normalize(username)));
  return !snap.exists();
}

/**
 * Crea o aggiorna il profilo ricalcolando i campi derivati, e riserva l'username
 * in modo atomico: se qualcuno l'ha preso un istante prima, la transazione fallisce
 * invece di lasciare due profili con lo stesso handle.
 */
export async function saveProfile(
  uid: string,
  input: ProfileInput,
  options: { markOnboarded?: boolean } = {},
): Promise<void> {
  const username = normalize(input.username).replace(/\s/g, "");
  if (username.length < 3) throw new Error("L'username deve avere almeno 3 caratteri.");
  if (username.length > 30) throw new Error("L'username non può superare i 30 caratteri.");
  if (isReservedUsername(username)) {
    throw new Error(`L'username "${username}" è riservato: scegline un altro.`);
  }

  const bio = input.bio.slice(0, BIO_MAX_LENGTH);
  const tags = [...new Set(input.tags.map(normalize).filter(Boolean))];
  const links = input.links.map((link, index) => ({ ...link, order: index }));

  const profileRef = doc(db, PROFILES, uid);
  const usernameRef = doc(db, USERNAMES, username);

  await runTransaction(db, async (tx) => {
    const [existingProfile, usernameOwner] = await Promise.all([
      tx.get(profileRef),
      tx.get(usernameRef),
    ]);

    if (usernameOwner.exists() && usernameOwner.data().uid !== uid) {
      throw new Error(`L'username "${username}" è già occupato.`);
    }

    const previousUsername = existingProfile.data()?.username as string | undefined;
    if (previousUsername && previousUsername !== username) {
      tx.delete(doc(db, USERNAMES, previousUsername));
    }

    tx.set(usernameRef, { uid });
    tx.set(
      profileRef,
      {
        uid,
        username,
        displayName: input.displayName.trim() || username,
        bio,
        avatarUrl: input.avatarUrl,
        category: input.category,
        tags,
        location: input.location?.trim() || null,
        locationKey: input.location ? normalize(input.location) : null,
        links,
        platforms: [...new Set(links.map((l) => l.platform))],
        searchTokens: buildSearchTokens(username, input.displayName, tags),
        verified: existingProfile.data()?.verified ?? false,
        // `merge` conserverebbe il valore precedente, ma scriverlo esplicitamente
        // rende ovvio che solo il wizard può segnare il profilo come completato.
        onboardedAt: options.markOnboarded
          ? serverTimestamp()
          : (existingProfile.data()?.onboardedAt ?? null),
        createdAt: existingProfile.data()?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

/**
 * Al primo accesso crea una bozza di profilo, ricavando un username libero
 * dall'email. Gira a ogni login: se il profilo esiste non tocca nulla.
 */
export async function ensureProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<Profile> {
  const existing = await getProfileByUid(user.uid);
  if (existing) return existing;

  const base = normalize(user.email?.split("@")[0] ?? user.displayName ?? "utente")
    .replace(/\s/g, "")
    .slice(0, 20)
    .padEnd(3, "0");

  // Un'email tipo info@ o admin@ genererebbe un handle riservato: si parte
  // già dal primo suffisso invece di provare la base nuda.
  let username = isReservedUsername(base) ? `${base}1` : base;
  for (let attempt = 1; isReservedUsername(username) || !(await isUsernameAvailable(username)); attempt++) {
    if (attempt > 20) throw new Error("Impossibile generare un username libero.");
    username = `${base}${attempt}`;
  }

  await saveProfile(user.uid, {
    username,
    displayName: user.displayName ?? username,
    bio: "",
    avatarUrl: user.photoURL,
    category: null,
    tags: [],
    location: null,
    links: [],
  });

  const created = await getProfileByUid(user.uid);
  if (!created) throw new Error("Profilo creato ma non rileggibile.");
  return created;
}
