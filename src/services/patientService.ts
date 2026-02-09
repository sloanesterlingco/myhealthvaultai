// src/services/patientService.ts

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth } from "../lib/firebase";

const db = getFirestore();

/* -----------------------------------------------------
   HELPER – Firestore requires a guaranteed string UID
------------------------------------------------------ */
function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User is not authenticated");
  return uid;
}

/* -----------------------------------------------------
   TYPE DEFINITIONS
------------------------------------------------------ */

export interface PatientProfile {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  [key: string]: any;
}

export interface Condition {
  id: string;
  name: string;
  description?: string;
  onsetDate?: string;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  createdAt?: string;
}

export interface Provider {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface InsuranceCard {
  id: string;
  provider?: string;
  memberId?: string;
  groupNumber?: string;
  planName?: string;
  phone?: string;
  imageUrl?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface Medication {
  id?: string;
  userId?: string;
  name?: string;
  genericName?: string;
  dosage?: string;
  frequency?: string;
  notes?: string;
  status?: "active" | "inactive" | string;
  createdAt?: any;
  createdAtMs?: number;
  updatedAtMs?: number;
  [key: string]: any;
}

export interface Allergy {
  id: string;
  allergen: string;
  reaction?: string;
  severity?: string;
  notes?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface TimelineEvent {
  id?: string;
  userId?: string;
  type?: string;
  summary?: string;
  detail?: string;
  level?: string;
  timestamp?: number;
  timestampMs?: number;
  meta?: Record<string, any>;
  [key: string]: any;
}

/* -----------------------------------------------------
   PATIENT SERVICE (Firestore)
------------------------------------------------------ */

export const patientService = {
  /* ------------------------
     Profile
  ------------------------- */
  async getProfile(): Promise<PatientProfile | null> {
    const uid = getUid();
    const ref = doc(db, "patients", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return (snap.data() as any) as PatientProfile;
  },

  async saveProfile(profile: Partial<PatientProfile>): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid);

    await setDoc(
      ref,
      {
        ...profile,
        updatedAtMs: Date.now(),
      },
      { merge: true }
    );
  },

  /* ------------------------
     Conditions
  ------------------------- */
  async listConditions(): Promise<Condition[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "conditions");

    const q = query(ref, orderBy("createdAtMs", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
      } as Condition;
    });
  },

  async addCondition(condition: Partial<Condition>): Promise<void> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "conditions");
    const nowMs = Date.now();

    await addDoc(ref, {
      ...condition,
      userId: uid,
      createdAtMs: nowMs,
      createdAt: new Date(nowMs).toISOString(),
    });
  },

  async updateCondition(id: string, condition: Partial<Condition>): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "conditions", id);

    await setDoc(
      ref,
      {
        ...condition,
        userId: uid,
        updatedAtMs: Date.now(),
      },
      { merge: true }
    );
  },

  /* ------------------------
     Emergency Contacts
  ------------------------- */
  async listEmergencyContacts(): Promise<EmergencyContact[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "emergencyContacts");
    const q = query(ref, orderBy("createdAtMs", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
      } as EmergencyContact;
    });
  },

  async addEmergencyContact(contact: Partial<EmergencyContact>): Promise<void> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "emergencyContacts");
    const nowMs = Date.now();

    await addDoc(ref, {
      ...contact,
      userId: uid,
      createdAtMs: nowMs,
      createdAt: new Date(nowMs).toISOString(),
    });
  },

  async updateEmergencyContact(
    id: string,
    contact: Partial<EmergencyContact>
  ): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "emergencyContacts", id);

    await setDoc(
      ref,
      {
        ...contact,
        userId: uid,
        updatedAtMs: Date.now(),
      },
      { merge: true }
    );
  },

  /* ------------------------
     Providers
  ------------------------- */
  async listProviders(): Promise<Provider[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "providers");
    const q = query(ref, orderBy("createdAtMs", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
      } as Provider;
    });
  },

  async addProvider(provider: Partial<Provider>): Promise<void> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "providers");
    const nowMs = Date.now();

    await addDoc(ref, {
      ...provider,
      userId: uid,
      createdAtMs: nowMs,
      createdAt: new Date(nowMs).toISOString(),
    });
  },

  async updateProvider(id: string, provider: Partial<Provider>): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "providers", id);

    await setDoc(
      ref,
      {
        ...provider,
        userId: uid,
        updatedAtMs: Date.now(),
      },
      { merge: true }
    );
  },

  /* ------------------------
     Insurance Cards
  ------------------------- */
  async listInsuranceCards(): Promise<InsuranceCard[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "insuranceCards");
    const q = query(ref, orderBy("createdAtMs", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
      } as InsuranceCard;
    });
  },

  async addInsuranceCard(card: Partial<InsuranceCard>): Promise<void> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "insuranceCards");
    const nowMs = Date.now();

    await addDoc(ref, {
      ...card,
      userId: uid,
      createdAtMs: nowMs,
      createdAt: new Date(nowMs).toISOString(),
    });
  },

  async updateInsuranceCard(id: string, card: Partial<InsuranceCard>): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "insuranceCards", id);

    await setDoc(
      ref,
      {
        ...card,
        userId: uid,
        updatedAtMs: Date.now(),
      },
      { merge: true }
    );
  },

  /* ------------------------
     Medications
  ------------------------- */
  async listMedications(): Promise<Medication[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "medications");

    // Prefer createdAtMs (reliable numeric) for sorting
    const q = query(ref, orderBy("createdAtMs", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;

      // Backward compatibility defaults
      const name = data.name ?? "";
      const genericName = data.genericName ?? data.name ?? "";

      return {
        ...data,
        id: d.id,
        name,
        genericName,
        userId: data.userId ?? uid,
        createdAtMs: data.createdAtMs,
        updatedAtMs: data.updatedAtMs,
      } as Medication;
    });
  },

  async addMedication(medication: Partial<Medication>): Promise<void> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "medications");

    const nowMs = Date.now();

    await addDoc(ref, {
      ...medication,
      userId: uid,

      // ✅ FIX: Use Firestore Timestamp (server) to avoid rules/type rejection
      createdAt: serverTimestamp(),

      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    });
  },

  async updateMedication(
    id: string,
    medication: Partial<Medication>
  ): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "medications", id);

    await setDoc(
      ref,
      {
        ...medication,
        // ensure these exist for web parity + sorting + "last updated"
        userId: uid,
        updatedAtMs: Date.now(),
      },
      { merge: true }
    );
  },

  /* ------------------------
     Allergies
  ------------------------- */
  async listAllergies(): Promise<Allergy[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "allergies");
    const q = query(ref, orderBy("createdAtMs", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
      } as Allergy;
    });
  },

  async addAllergy(allergy: Partial<Allergy>): Promise<void> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "allergies");
    const nowMs = Date.now();

    await addDoc(ref, {
      ...allergy,
      userId: uid,
      createdAtMs: nowMs,
      createdAt: new Date(nowMs).toISOString(),
    });
  },

  async updateAllergy(id: string, allergy: Partial<Allergy>): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "allergies", id);

    await setDoc(
      ref,
      {
        ...allergy,
        userId: uid,
        updatedAtMs: Date.now(),
      },
      { merge: true }
    );
  },

  /* ------------------------
     Timeline
  ------------------------- */
  async addTimelineEvent(event: Partial<TimelineEvent>): Promise<void> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "timelineEvents");

    const now = Date.now();

    await addDoc(ref, {
      ...event,
      userId: uid,
      timestampMs: event.timestampMs ?? event.timestamp ?? now,
      timestamp: event.timestamp ?? event.timestampMs ?? now,
    });
  },

  async listTimelineEvents(): Promise<TimelineEvent[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "timelineEvents");
    const q = query(ref, orderBy("timestampMs", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
      } as TimelineEvent;
    });
  },
};
