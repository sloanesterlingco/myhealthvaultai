// src/features/allergies/services/allergiesService.ts

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import {
  allergySchema,
  type Allergy,
  type AllergyInput,
} from "../types/allergyTypes";

const ALLERGIES_COLLECTION = "allergies";

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User is not authenticated");
  return uid;
}

function slugId(input: string): string {
  const s = String(input ?? "").trim().toLowerCase();
  // Firestore doc ids can't include "/" so we sanitize heavily
  const safe = s
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .slice(0, 120);
  return safe || `allergy-${Date.now()}`;
}

export const allergiesService = {
  async getAllergies(): Promise<Allergy[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, ALLERGIES_COLLECTION);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const results: Allergy[] = [];

    snap.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      const parsed = allergySchema.safeParse(data);
      if (parsed.success) {
        results.push(parsed.data);
      } else {
        console.warn("Invalid allergy document skipped:", parsed.error);
      }
    });

    return results;
  },

  // ✅ CHANGED: uses deterministic doc id so duplicates cannot explode
  async addAllergy(input: AllergyInput): Promise<{ id: string }> {
    const uid = getUid();
    const now = new Date().toISOString();

    const payload = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    const parsed = allergySchema.omit({ id: true }).safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid allergy payload: " + parsed.error.message);
    }

    const id = slugId(parsed.data.substance);
    const ref = doc(db, "patients", uid, ALLERGIES_COLLECTION, id);

    // merge=false: keep it simple, overwrite same substance with latest
    await setDoc(ref, parsed.data, { merge: false });

    return { id };
  },

  async updateAllergy(id: string, patch: Partial<AllergyInput>): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, ALLERGIES_COLLECTION, id);
    const now = new Date().toISOString();

    await updateDoc(ref, {
      ...patch,
      updatedAt: now,
    });
  },

  async deleteAllergy(id: string): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, ALLERGIES_COLLECTION, id);
    await deleteDoc(ref);
  },
};
