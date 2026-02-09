// src/services/labService.ts

import { LabEntry } from "../models/labEntry.model";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

const LABS_COLLECTION = "labs";

export async function saveLabEntry(
  userId: string,
  lab: Omit<LabEntry, "id" | "createdAt">
) {
  const ref = collection(db, "users", userId, LABS_COLLECTION);

  await addDoc(ref, {
    ...lab,
    createdAt: new Date().toISOString(),
  });
}

export async function getLabsByAnalyte(
  userId: string,
  analyte: string
): Promise<LabEntry[]> {
  const ref = collection(db, "users", userId, LABS_COLLECTION);

  const q = query(
    ref,
    where("analyte", "==", analyte),
    orderBy("collectedDate", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<LabEntry, "id">),
  }));
}
