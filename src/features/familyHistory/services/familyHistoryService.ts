import { addDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export const familyHistoryService = {
  async getFamilyHistory() {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const snap = await getDocs(collection(db, "patients", uid, "familyHistory"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addFamilyHistory(entry: any) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await addDoc(collection(db, "patients", uid, "familyHistory"), {
      ...entry,
      createdAt: new Date().toISOString(),
    });
  },
};
