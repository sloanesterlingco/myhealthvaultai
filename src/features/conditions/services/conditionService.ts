// src/features/conditions/services/conditionsService.ts

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
const COLLECTION = "conditions";

export interface ConditionRecord {
  id?: string;
  uid: string;

  name: string;
  status?: string;
  onsetDate?: string;

  code?: string; // ICD-10 or SNOMED
  codeSystem?: string; // "ICD-10" | "SNOMED"
  codeDescription?: string;

  createdAt: number;
  updatedAt?: number;
}

export const conditionsService = {
  // -------------------------------------------------------
  // ADD CONDITION
  // -------------------------------------------------------
  async addCondition(data: ConditionRecord) {
    const id = doc(collection(db, COLLECTION)).id; // generate an ID

    const payload: ConditionRecord = {
      ...data,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, COLLECTION, id), payload);

    return payload;
  },

  // -------------------------------------------------------
  // UPDATE CONDITION
  // -------------------------------------------------------
  async updateCondition(id: string, updates: Partial<ConditionRecord>) {
    const payload = {
      ...updates,
      updatedAt: Date.now(),
    };

    await updateDoc(doc(db, COLLECTION, id), payload);
    return { id, ...payload };
  },

  // -------------------------------------------------------
  // DELETE CONDITION
  // -------------------------------------------------------
  async deleteCondition(id: string) {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  // -------------------------------------------------------
  // GET A SINGLE CONDITION
  // -------------------------------------------------------
  async getCondition(id: string) {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? (snap.data() as ConditionRecord) : null;
  },

  // -------------------------------------------------------
  // LIST CONDITIONS BY USER
  // -------------------------------------------------------
  async listConditions(uid: string) {
    const q = query(collection(db, COLLECTION), where("uid", "==", uid));
    const snap = await getDocs(q);

    return snap.docs.map((d) => d.data() as ConditionRecord);
  },
};
