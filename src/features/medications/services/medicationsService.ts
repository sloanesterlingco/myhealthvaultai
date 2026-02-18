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
 *
 * Firestore IMPORTANT:
 * - Firestore rejects `undefined` anywhere in objects.
 *   So we must strip undefined before setDoc/updateDoc.
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

/**
 * Firestore rejects `undefined` anywhere (including nested objects/arrays).
 * Remove undefined recursively.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    // @ts-ignore
    return value.map(stripUndefined).filter((v) => v !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }

  return value;
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

  // ✅ deterministic id prevents duplicates from AI double-apply
  async addMedication(input: MedicationInput): Promise<string> {
    const uid = requireUid();
    const now = new Date().toISOString();

    const key = medKey(input);
    const id = slugId(key || (input as any)?.name || `med-${Date.now()}`);

    const ref = doc(db, PATHS.patients, uid, PATHS.medications, id);

    // ✅ Firestore-safe: remove undefined (ex: notes: undefined)
    // Also allows extra OCR fields (rxNumber, pharmacyPhone, ndc, rawOcrText, etc.)
    const payload = stripUndefined({
      ...(input as any),

      // optional safety: ensure notes never undefined if your UI uses it a lot
      notes: (input as any)?.notes ?? "",

      createdAt: now,
      updatedAt: now,
    });

    await setDoc(ref, payload, { merge: false });

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

    const payload = stripUndefined({
      ...(patch as any),

      // If patch includes notes but it's undefined, we drop it.
      // If you want notes to never be undefined in updates:
      ...(Object.prototype.hasOwnProperty.call(patch as any, "notes")
        ? { notes: (patch as any).notes ?? "" }
        : {}),

      updatedAt: now,
    });

    await updateDoc(ref, payload as any);
  },

  async deactivateMedication(medicationId: string): Promise<void> {
    const uid = requireUid();
    if (!medicationId) throw new Error("medicationId is required");

    const now = new Date().toISOString();
    const ref = doc(db, PATHS.patients, uid, PATHS.medications, medicationId);

    await updateDoc(
      ref,
      stripUndefined({
        endDate: now.slice(0, 10),
        updatedAt: now,
      }) as any
    );
  },
};
