// src/lib/firebase.ts
//
// V1-stable Firebase init for Expo/React Native.
// ✅ Uses explicit Storage bucket when provided (prevents storage/unknown from mis-config)
// ✅ Works reliably across builds.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

type FirebaseConfig = {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

function requireEnv(key: string): string {
  const v = (process.env as any)[key] as string | undefined;
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
}

function getFirebaseConfig(): FirebaseConfig {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "";
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "";
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "";

  return {
    apiKey: apiKey || requireEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: projectId || requireEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: appId || requireEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
  };
}

const config = getFirebaseConfig();

export const app = getApps().length ? getApp() : initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ IMPORTANT: explicitly bind bucket if provided
export const storage = config.storageBucket
  ? getStorage(app, `gs://${config.storageBucket}`)
  : getStorage(app);
