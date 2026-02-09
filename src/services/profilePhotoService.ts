import { auth } from "../lib/firebase";
import { db } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system/legacy";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user;
}

function guessContentType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function uploadProfilePhotoFromUri(imageUri: string): Promise<string> {
  const user = requireUser();

  // Read file as base64 (stable in Expo)
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const contentType = guessContentType(imageUri);

  // IMPORTANT: If your firebase init uses the correct bucket, this is enough.
  // If your project needs a specific bucket, you can do:
  // const storage = getStorage(undefined, `gs://${process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET}`);
  const storage = getStorage();

  const path = `profilePhotos/${user.uid}/avatar_${Date.now()}`;
  const storageRef = ref(storage, path);

  // Upload base64
  await uploadString(storageRef, base64, "base64", { contentType });

  // Get public download URL
  const downloadUrl = await getDownloadURL(storageRef);

  // Save URL to Firestore (pick ONE canonical place)
  // Option A (recommended in your schema): patients/{uid}
  await setDoc(
    doc(db, "patients", user.uid),
    {
      photoURL: downloadUrl,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return downloadUrl;
}
