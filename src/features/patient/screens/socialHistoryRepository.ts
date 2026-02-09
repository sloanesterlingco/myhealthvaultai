import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { SocialHistorySchema, type SocialHistory } from "../models/patientSchemas";

const PATIENTS_COLLECTION = "patients";

function patientDocRef(patientId: string) {
  return doc(db, PATIENTS_COLLECTION, patientId);
}

export async function getSocialHistory(patientId: string): Promise<SocialHistory | null> {
  const snap = await getDoc(patientDocRef(patientId));
  if (!snap.exists()) return null;

  const data = snap.data() as any;
  if (!data?.socialHistory) return null;

  return SocialHistorySchema.parse(data.socialHistory);
}

export async function upsertSocialHistory(
  patientId: string,
  social: Partial<SocialHistory>
): Promise<void> {
  const ref = patientDocRef(patientId);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? ((snap.data() as any).socialHistory ?? {}) : {};

  const merged = { ...existing, ...social };
  const parsed = SocialHistorySchema.parse(merged);

  await setDoc(
    ref,
    {
      socialHistory: parsed,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
