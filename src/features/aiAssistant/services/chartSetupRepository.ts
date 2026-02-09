// src/features/aiAssistant/services/chartSetupRepository.ts
import { auth, db } from "../../../lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { ChartSetupMessage } from "../hooks/useAIChartSetup";
import type { PatientAggregationModel } from "./patientAggregationService";

type ChartSetupDoc = {
  messages: ChartSetupMessage[];
  patientState: PatientAggregationModel;
  updatedAt: any;
  createdAt?: any;
};

function requireUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

function docRef(uid: string) {
  // single doc per user for now (simple alpha)
  return doc(db, "ai_sessions", uid, "sessions", "chartSetup");
}

export const chartSetupRepository = {
  async load(): Promise<ChartSetupDoc | null> {
    const uid = requireUid();
    const ref = docRef(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as ChartSetupDoc;
  },

  async createIfMissing(payload: Omit<ChartSetupDoc, "updatedAt">) {
    const uid = requireUid();
    const ref = docRef(uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;

    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } satisfies ChartSetupDoc);
  },

  async save(messages: ChartSetupMessage[], patientState: PatientAggregationModel) {
    const uid = requireUid();
    const ref = docRef(uid);

    // setDoc with merge keeps it simple if doc doesn't exist yet
    await setDoc(
      ref,
      {
        messages,
        patientState,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async clear() {
    const uid = requireUid();
    const ref = docRef(uid);
    await setDoc(
      ref,
      {
        messages: [],
        patientState: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },
};
