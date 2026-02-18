// src/services/patientService.ts

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// ✅ Timeline logging (best-effort, never block core saves)
import { timelineService } from "../features/medicalTimeline/services/timelineService";

export type PatientProfile = {
  userId: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  sex?: string;
  height?: string;
  weight?: string;
  bloodType?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceProvider?: string;
  insuranceMemberId?: string;
  insuranceGroupId?: string;
  insurancePlan?: string;
  insuranceRxBin?: string;
  insuranceRxPcn?: string;
  insuranceRxGroup?: string;
  insuranceRxId?: string;
  allergiesSetupComplete?: boolean;
  medicationsSetupComplete?: boolean;
  familyHistorySetupComplete?: boolean;
  createdAt?: any;
  createdAtMs?: number;
  updatedAt?: any;
  updatedAtMs?: number;
};

export type InsuranceCard = {
  id: string;
  userId: string;
  frontUrl?: string | null;
  backUrl?: string | null;
  createdAt?: any;
  createdAtMs?: number;
  updatedAt?: any;
  updatedAtMs?: number;
};

export type Medication = {
  id: string;
  userId: string;

  name: string;
  genericName?: string | null;

  dosage?: string | null;
  frequency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;

  status?: "active" | "stopped" | "unknown" | string;

  createdAt?: any;
  createdAtMs?: number;
  updatedAt?: any;
  updatedAtMs?: number;

  [key: string]: any;
};

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User is not authenticated");
  return uid;
}

function stripUndefined(value: any): any {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((v) => v !== undefined);
  }
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

export const patientService = {
  async getProfile(): Promise<PatientProfile | null> {
    const uid = getUid();
    const ref = doc(db, "patients", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as PatientProfile;
  },

  async upsertProfile(profile: Partial<PatientProfile>): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid);
    const nowMs = Date.now();

    await setDoc(
      ref,
      stripUndefined({
        ...profile,
        userId: uid,
        updatedAtMs: nowMs,
        updatedAt: serverTimestamp(),
        createdAtMs: profile.createdAtMs ?? nowMs,
        createdAt: profile.createdAt ?? serverTimestamp(),
      }),
      { merge: true }
    );
  },

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

    await addDoc(
      ref,
      stripUndefined({
        ...card,
        userId: uid,
        createdAtMs: nowMs,
        createdAt: new Date(nowMs).toISOString(),
      })
    );
  },

  async updateInsuranceCard(
    id: string,
    card: Partial<InsuranceCard>
  ): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "insuranceCards", id);

    await setDoc(
      ref,
      stripUndefined({
        ...card,
        userId: uid,
        updatedAtMs: Date.now(),
      }),
      { merge: true }
    );
  },

  async listMedications(): Promise<Medication[]> {
    const uid = getUid();
    const ref = collection(db, "patients", uid, "medications");

    const q = query(ref, orderBy("createdAtMs", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;
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

    const safeMedication = stripUndefined({
      ...medication,
      notes: Object.prototype.hasOwnProperty.call(medication as any, "notes")
        ? ((medication as any).notes ?? "")
        : undefined,
    });

    const docRef = await addDoc(ref, {
      ...safeMedication,
      userId: uid,
      createdAt: serverTimestamp(),
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    });

    // Best-effort timeline breadcrumb
    try {
      const name = String((medication as any)?.name ?? "").trim();
      const dosage = String((medication as any)?.dosage ?? "").trim();
      const frequency = String((medication as any)?.frequency ?? "").trim();

      await timelineService.addEvent({
        type: "MEDICATION_ADDED",
        category: "medications",
        summary: name ? `Medication: ${name}` : "Medication added",
        detail:
          dosage || frequency
            ? [dosage ? `Dosage: ${dosage}` : null, frequency ? `Frequency: ${frequency}` : null]
                .filter(Boolean)
                .join(" • ")
            : "Added to your medication list.",
        level: "info",
        timestamp: nowMs,
        meta: {
          source: "medications",
          medicationId: docRef.id,
          name,
          dosage,
          frequency,
        },
      } as any);
    } catch {
      // no-op
    }
  },

  async updateMedication(
    id: string,
    medication: Partial<Medication>
  ): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "medications", id);

    const safePatch = stripUndefined({
      ...medication,
      notes: Object.prototype.hasOwnProperty.call(medication as any, "notes")
        ? ((medication as any).notes ?? "")
        : undefined,
      userId: uid,
      updatedAtMs: Date.now(),
    });

    await setDoc(ref, safePatch, { merge: true });

    // Best-effort timeline breadcrumb
    try {
      const name = String((medication as any)?.name ?? "").trim();
      await timelineService.addEvent({
        type: "MEDICATION_UPDATED",
        category: "medications",
        summary: name ? `Medication updated: ${name}` : "Medication updated",
        detail: "Medication details updated.",
        level: "low",
        timestamp: Date.now(),
        meta: { source: "medications", medicationId: id },
      } as any);
    } catch {
      // no-op
    }
  },

  // ✅ NEW: remove medication
  async deleteMedication(id: string): Promise<void> {
    const uid = getUid();
    const ref = doc(db, "patients", uid, "medications", id);
    await deleteDoc(ref);

    // Best-effort timeline breadcrumb
    try {
      await timelineService.addEvent({
        type: "MEDICATION_REMOVED",
        category: "medications",
        summary: "Medication removed",
        detail: "Removed from your medication list.",
        level: "low",
        timestamp: Date.now(),
        meta: { source: "medications", medicationId: id },
      } as any);
    } catch {
      // no-op
    }
  },
};
