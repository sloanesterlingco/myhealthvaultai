// src/features/medications/services/medicationsService.ts

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import type { Medication, MedicationInput } from "../types/medicationTypes";

/**
 * ✅ V1 Source of Truth (Medications)
 * Firestore Path:
 *   patients/{uid}/medications/{medicationId}
 */

const PATHS = {
  patients: "patients",
  medications: "medications",
};

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User is not authenticated");
  return uid;
}

function slugId(input: string): string {
  const s = String(input ?? "").trim().toLowerCase();
  const safe = s
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .slice(0, 140);
  return safe || `med-${Date.now()}`;
}

function medKey(input: MedicationInput): string {
  const name = String((input as any)?.name ?? "").trim();
  const dosage = String((input as any)?.dosage ?? "").trim();
  const freq = String((input as any)?.frequency ?? "").trim();
  return [name, dosage, freq].filter(Boolean).join("|");
}

export const medicationsService = {
  async getMedications(): Promise<Medication[]> {
    const uid = requireUid();

    const ref = collection(db, PATHS.patients, uid, PATHS.medications);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Medication, "id">),
    }));
  },

  // ✅ CHANGED: deterministic id prevents duplicates from AI double-apply
  async addMedication(input: MedicationInput): Promise<string> {
    const uid = requireUid();
    const now = new Date().toISOString();

    const key = medKey(input);
    const id = slugId(key || (input as any)?.name || `med-${Date.now()}`);

    const ref = doc(db, PATHS.patients, uid, PATHS.medications, id);

    await setDoc(
      ref,
      {
        ...input,
        createdAt: now,
        updatedAt: now,
      },
      { merge: false }
    );

    return id;
  },

  async updateMedication(
    medicationId: string,
    patch: Partial<Omit<Medication, "id" | "createdAt">>
  ): Promise<void> {
    const uid = requireUid();
    if (!medicationId) throw new Error("medicationId is required");

    const now = new Date().toISOString();

    const ref = doc(db, PATHS.patients, uid, PATHS.medications, medicationId);

    await updateDoc(ref, {
      ...patch,
      updatedAt: now,
    });
  },

  async deactivateMedication(medicationId: string): Promise<void> {
    const uid = requireUid();
    if (!medicationId) throw new Error("medicationId is required");

    const now = new Date().toISOString();

    const ref = doc(db, PATHS.patients, uid, PATHS.medications, medicationId);

    await updateDoc(ref, {
      endDate: now.slice(0, 10),
      updatedAt: now,
    });
  },
};
