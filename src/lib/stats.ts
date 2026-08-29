import { doc, getDoc, increment, setDoc } from "firebase/firestore";

import { db } from "./firebase";

const STATS = "stats";

export type ProfileStats = {
  views: number;
  /** Click per id di link. I link cancellati restano qui come storico. */
  clicks: Record<string, number>;
};

/**
 * Registra una visita.
 *
 * `setDoc` con `merge` crea il documento se manca e incrementa se c'è: evita
 * la lettura preventiva, che sarebbe una lettura fatturata per ogni visita.
 * Nessuna informazione sul visitatore viene salvata — solo un contatore.
 */
export async function recordProfileView(uid: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Una visita per sessione e per profilo: senza, un refresh o un rimbalzo
  // avanti-indietro gonfierebbe il numero fino a renderlo inutile.
  const seenKey = `vewsy:viewed:${uid}`;
  try {
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");
  } catch {
    // Navigazione privata o storage bloccato: si conta comunque la visita.
  }

  await writeQuietly(uid, { views: increment(1) });
}

export async function recordLinkClick(uid: string, linkId: string): Promise<void> {
  await writeQuietly(uid, { clicks: { [linkId]: increment(1) } });
}

export async function getStats(uid: string): Promise<ProfileStats> {
  const snap = await getDoc(doc(db, STATS, uid));
  const data = snap.data();
  return {
    views: typeof data?.views === "number" ? data.views : 0,
    clicks: (data?.clicks ?? {}) as Record<string, number>,
  };
}

/**
 * Le statistiche non devono mai rovinare la navigazione: se la scrittura
 * fallisce (regole, rete, quota, blocco del browser) il visitatore non deve
 * accorgersene, e soprattutto il click su un link deve partire lo stesso.
 */
async function writeQuietly(uid: string, data: Record<string, unknown>): Promise<void> {
  try {
    await setDoc(doc(db, STATS, uid), data, { merge: true });
  } catch {
    // Volutamente silenzioso.
  }
}
