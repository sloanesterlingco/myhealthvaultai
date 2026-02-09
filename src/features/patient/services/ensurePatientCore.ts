// src/features/patient/services/ensurePatientCore.ts

import { upsertPatientCore } from "./patientRepository";

/**
 * Ensures the root patient doc exists: patients/{uid}
 * Prevents Firestore rules from denying access to subcollections.
 *
 * Safe to call many times; will only run once per uid per app session.
 */
const ensuredByUid: Record<string, boolean> = {};

export async function ensurePatientCoreOnce(uid: string) {
  if (!uid) return;
  if (ensuredByUid[uid]) return;

  try {
    await upsertPatientCore(uid, {});
    ensuredByUid[uid] = true;
  } catch (e) {
    // Non-blocking: don't break the app if network hiccups
    console.log("ensurePatientCoreOnce failed:", e);
  }
}
