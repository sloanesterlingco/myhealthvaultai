// src/services/medicationService.ts

import { Medication } from "../models/medication.model";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";

const MEDS_COLLECTION = "medications";

export async function saveMedication(
  userId: string,
  medication: Omit<Medication, "id" | "createdAt">
) {
  const ref = collection(db, "users", userId, MEDS_COLLECTION);

  await addDoc(ref, {
    ...medication,
    createdAt: new Date().toISOString(),
  });
}

export async function getMedications(userId: string): Promise<Medication[]> {
  const ref = collection(db, "users", userId, MEDS_COLLECTION);
  const snapshot = await getDocs(ref);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Medication, "id">),
  }));
}

export async function deactivateMedication(
  userId: string,
  medicationId: string
) {
  const ref = doc(db, "users", userId, MEDS_COLLECTION, medicationId);

  await updateDoc(ref, {
    active: false,
    updatedAt: new Date().toISOString(),
  });
}
