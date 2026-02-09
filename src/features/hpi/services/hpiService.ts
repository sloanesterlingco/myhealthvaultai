import { addDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export interface HPIEntry {
  id?: string;
  chiefComplaint: string;
  onset?: string;
  duration?: string;
  severity?: string;
  progression?: string;
  modifyingFactors?: string;
  associatedSymptoms?: string[];
  context?: string;
  notes?: string;
  createdAt: string;
}

const HPI_COLLECTION = "hpi";

export const hpiService = {
  async getHPI(): Promise<HPIEntry[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const snap = await getDocs(collection(db, "patients", uid, HPI_COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as HPIEntry) }));
  },

  async addHPI(entry: Omit<HPIEntry, "id" | "createdAt">): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await addDoc(collection(db, "patients", uid, HPI_COLLECTION), {
      ...entry,
      createdAt: new Date().toISOString(),
    });
  },
};
