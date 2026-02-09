import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export const socialHistoryService = {
  async getSocialHistory() {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    const ref = doc(db, "patients", uid, "more", "socialHistory");
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async updateSocialHistory(data: any) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, "patients", uid, "more", "socialHistory");
    await setDoc(ref, data, { merge: true });
  },
};
