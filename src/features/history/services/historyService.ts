// src/features/history/services/historyService.ts

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { NormalizedResult } from "../../aiAssistant/types/NormalizedResult";

const db = getFirestore();

const CONDITIONS_COLLECTION = "conditions";
const SURGERIES_COLLECTION = "surgeries";

export type HistoryCategory = "condition" | "procedure";

export interface HistoryItem {
  id: string;
  category: HistoryCategory;
  text: string;
  code?: string;
  codeSystem?: string;
  codeDescription?: string;
  onsetDate?: string;
  year?: string;
  createdAt?: number;
}

export const historyService = {
  // -------------------------------------------------------
  // Load combined history list (conditions + surgeries)
  // -------------------------------------------------------
  async getHistory(uid: string): Promise<HistoryItem[]> {
    const items: HistoryItem[] = [];

    // CONDITIONS
    const cQuery = query(
      collection(db, CONDITIONS_COLLECTION),
      where("uid", "==", uid)
    );
    const cSnap = await getDocs(cQuery);

    cSnap.forEach((d) => {
      const data = d.data() as any;
      items.push({
        id: d.id,
        category: "condition",
        text: data.name,
        code: data.code,
        codeSystem: data.codeSystem,
        codeDescription: data.codeDescription,
        onsetDate: data.onsetDate,
        createdAt: data.createdAt,
      });
    });

    // SURGERIES / PROCEDURES
    const sQuery = query(
      collection(db, SURGERIES_COLLECTION),
      where("uid", "==", uid)
    );
    const sSnap = await getDocs(sQuery);

    sSnap.forEach((d) => {
      const data = d.data() as any;
      items.push({
        id: d.id,
        category: "procedure",
        text: data.procedure,
        code: data.code,
        codeSystem: data.codeSystem,
        codeDescription: data.codeDescription,
        year: data.year,
        createdAt: data.createdAt,
      });
    });

    // Sort newest first
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  // -------------------------------------------------------
  // Add from AI (conditions & procedures)
  // -------------------------------------------------------
  async addFromAi(uid: string, result: NormalizedResult) {
    const bestCode = result.codes?.[0];
    const now = Date.now();

    switch (result.category) {
      case "condition":
      case "symptom": {
        const id = doc(collection(db, CONDITIONS_COLLECTION)).id;

        await setDoc(doc(db, CONDITIONS_COLLECTION, id), {
          id,
          uid,
          name: result.normalizedText,
          status: "active",
          code: bestCode?.code,
          codeSystem: bestCode?.system,
          codeDescription: bestCode?.description,
          createdAt: now,
        });
        break;
      }

      case "procedure":
      case "imaging": {
        const id = doc(collection(db, SURGERIES_COLLECTION)).id;

        await setDoc(doc(db, SURGERIES_COLLECTION, id), {
          id,
          uid,
          procedure: result.normalizedText,
          code: bestCode?.code,
          codeSystem: bestCode?.system,
          codeDescription: bestCode?.description,
          createdAt: now,
        });
        break;
      }

      default:
        throw new Error("Unknown AI category: " + result.category);
    }
  },

  // -------------------------------------------------------
  // Delete History Item
  // -------------------------------------------------------
  async deleteHistoryItem(id: string, category: HistoryCategory) {
    const col =
      category === "condition"
        ? CONDITIONS_COLLECTION
        : SURGERIES_COLLECTION;

    await deleteDoc(doc(db, col, id));
  },
};
