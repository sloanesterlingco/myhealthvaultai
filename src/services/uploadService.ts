// src/services/uploadService.ts
//
// Expo-safe Firebase Storage uploads (Android + iOS).
// IMPORTANT: Firebase uploadString(base64) can internally create a Blob from Uint8Array,
// which can throw in some RN environments:
// "Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported".
//
// This implementation uploads a REAL RN Blob created via fetch(file://...).blob(),
// then uses uploadBytes so Firebase does not attempt to re-construct a Blob.

import * as FileSystem from "expo-file-system/legacy";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "../lib/firebase";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user;
}

function guessContentType(uri: string) {
  const lower = (uri || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/**
 * Some Android pickers return content:// URIs.
 * Copy into a local file:// URI so fetch().blob() works reliably.
 */
async function ensureFileUri(uri: string): Promise<string> {
  if (!uri) return uri;
  if (!uri.startsWith("content://")) return uri;

  const FS: any = FileSystem as any;
  const baseDir: string = FS.cacheDirectory || FS.documentDirectory || "";
  const dest = `${baseDir}mhv_upload_${Date.now()}.jpg`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    // If copy fails, return original and let caller attempt anyway
    return uri;
  }
}

/**
 * Upload profile avatar image to Firebase Storage.
 * Stable path:
 *   profilePhotos/{uid}/avatar.jpg
 */
export async function uploadAvatarImage(
  imageUri: string
): Promise<{ url: string; path: string }> {
  const user = requireUser();

  const normalizedUri = await ensureFileUri(imageUri);
  const contentType = guessContentType(normalizedUri);

  const objectPath = `profilePhotos/${user.uid}/avatar.jpg`;
  const storageRef = ref(storage, objectPath);

  // ✅ Create a real RN Blob (avoids ArrayBufferView Blob creation)
  const resp = await fetch(normalizedUri);
  if (!resp.ok) {
    throw new Error("Could not read image file for upload.");
  }
  const blob: any = await resp.blob();

  try {
    await uploadBytes(storageRef, blob, { contentType });
  } finally {
    // Some RN blobs have close(); safe to call if present.
    try {
      blob?.close?.();
    } catch {}
  }

  const url = await getDownloadURL(storageRef);
  return { url, path: objectPath };
}

/**
 * Upload a medical record image to Firebase Storage.
 * Path:
 *   records/{uid}/{timestamp}_{safeName}.jpg
 */
export async function uploadRecordImage(
  imageUri: string,
  opts?: { fileName?: string }
): Promise<{ url: string; path: string }> {
  const user = requireUser();

  const normalizedUri = await ensureFileUri(imageUri);
  const contentType = guessContentType(normalizedUri);

  const ts = Date.now();
  const raw = (opts?.fileName || "record").trim() || "record";
  const safe = raw
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]+/g, "")
    .slice(0, 40);

  const objectPath = `records/${user.uid}/${ts}_${safe}.jpg`;
  const storageRef = ref(storage, objectPath);

  const resp = await fetch(normalizedUri);
  if (!resp.ok) {
    throw new Error("Could not read image file for upload.");
  }
  const blob: any = await resp.blob();

  try {
    await uploadBytes(storageRef, blob, { contentType });
  } finally {
    try {
      blob?.close?.();
    } catch {}
  }

  const url = await getDownloadURL(storageRef);
  return { url, path: objectPath };
}
