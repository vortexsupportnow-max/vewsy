import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

import { firebaseApp } from "./firebase";

/** Lato del quadrato finale. 512 basta per un avatar retina da 256 CSS px. */
const AVATAR_SIZE = 512;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Ridimensiona e carica l'avatar, restituendo l'URL pubblico.
 *
 * Il ridimensionamento avviene nel browser prima del caricamento: una foto da
 * fotocamera pesa 5-10MB, e servirla come avatar da 48px sprecherebbe banda
 * dell'utente a ogni card della directory.
 */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Formato non supportato: usa JPG, PNG o WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Immagine troppo grande: massimo 10MB.");
  }

  const square = await toSquareWebp(file);
  const storageRef = ref(getStorage(firebaseApp), `avatars/${uid}`);
  await uploadBytes(storageRef, square, { contentType: "image/webp" });
  return getDownloadURL(storageRef);
}

/** Ritaglia al centro, scala a AVATAR_SIZE e ricodifica in WebP. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossibile elaborare l'immagine.");

    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob) throw new Error("Conversione dell'immagine non riuscita.");
    return blob;
  } finally {
    // Senza, la bitmap decodificata resta in memoria: su mobile, dopo qualche
    // tentativo, la scheda viene terminata dal sistema.
    bitmap.close();
  }
}
