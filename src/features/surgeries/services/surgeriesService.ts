// src/features/surgeries/services/surgeriesService.ts

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const db = getFirestore();
const COLLECTION = "surgeries";

export interface SurgeryRecord {
  id?: string;
  uid: string;

  procedure: string;
  year?: string;
  notes?: string;

  code?: string; // SNOMED, HCPCS, CPT, etc.
  codeSystem?: string; // "SNOMED" | "HCPCS" | "CPT"
  codeDescription?: string;

  cptSuggestion?: string; // optional from AI (not stored by default)
  createdAt: number;
  updatedAt?: number;
}

export const surgeriesService = {
  // -------------------------------------------------------
  // ADD SURGERY
  // -------------------------------------------------------
  async addSurgery(data: SurgeryRecord) {
    const id = doc(collection(db, COLLECTION)).id;

    const payload: SurgeryRecord = {
      ...data,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, COLLECTION, id), payload);
    return payload;
  },

  // -------------------------------------------------------
  // UPDATE SURGERY
  // -------------------------------------------------------
  async updateSurgery(id: string, updates: Partial<SurgeryRecord>) {
    const payload = {
      ...updates,
      updatedAt: Date.now(),
    };

    await updateDoc(doc(db, COLLECTION, id), payload);
    return { id, ...payload };
  },

  // -------------------------------------------------------
  // DELETE SURGERY
  // -------------------------------------------------------
  async deleteSurgery(id: string) {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  // -------------------------------------------------------
  // GET ONE SURGERY RECORD
  // -------------------------------------------------------
  async getSurgery(id: string) {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? (snap.data() as SurgeryRecord) : null;
  },

  // -------------------------------------------------------
  // LIST SURGERIES FOR A USER
  // -------------------------------------------------------
  async listSurgeries(uid: string) {
    const q = query(collection(db, COLLECTION), where("uid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SurgeryRecord);
  },

  // ✅ Backwards-compatible alias (fixes: getSurgeries is not a function)
  async getSurgeries(uid: string) {
    return this.listSurgeries(uid);
  },
};
