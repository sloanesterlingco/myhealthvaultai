// src/features/vitals/services/vitalsRepository.ts

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export type VitalType = "bp" | "hr" | "spo2" | "rr" | "temp" | "weight" | "height";
export type VitalSource = "manual" | "ble" | "ocr";

export type VitalDoc = {
  id: string;
  userId: string;
  type: VitalType;

  timestampMs: number;

  systolic?: number;
  diastolic?: number;
  value?: number;

  notes?: string;
  source: VitalSource;

  createdAtMs: number;
};

export type AddVitalInput =
  | {
      type: "bp";
      timestampMs?: number;
      systolic: number;
      diastolic: number;
      notes?: string;
      source?: VitalSource;
    }
  | {
      type: Exclude<VitalType, "bp">;
      timestampMs?: number;
      value: number;
      notes?: string;
      source?: VitalSource;
    };

export type UpdateVitalInput =
  | {
      id: string;
      type: "bp";
      timestampMs?: number;
      systolic: number;
      diastolic: number;
      notes?: string;
      source?: VitalSource;
    }
  | {
      id: string;
      type: Exclude<VitalType, "bp">;
      timestampMs?: number;
      value: number;
      notes?: string;
      source?: VitalSource;
    };

const VITALS_COL = "vitals";

function requireUserId(userIdOverride?: string): string {
  if (userIdOverride?.trim()) return userIdOverride.trim();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

/** Firestore cannot store undefined. This strips undefined recursively. */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as any;
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return obj;
}

/**
 * ✅ Normalize any older/mismatched vital type strings so the UI can always find them.
 */
function normalizeVitalType(raw: any): VitalType {
  const s = String(raw ?? "")
    .trim()
    .replace(/[\s_-]/g, "")
    .toLowerCase();

  // BP
  if (s === "bp" || s === "bloodpressure" || s === "bloodpressuremmhg") return "bp";

  // HR
  if (s === "hr" || s === "heartrate" || s === "pulse") return "hr";

  // SpO2
  if (s === "spo2" || s === "oxygensaturation" || s === "bloodoxygen" || s === "o2sat")
    return "spo2";

  // RR
  if (s === "rr" || s === "respiratoryrate" || s === "respirationrate") return "rr";

  // Temp
  if (s === "temp" || s === "temperature") return "temp";

  // Weight
  if (s === "weight") return "weight";

  // Height ✅ NEW
  if (s === "height") return "height";

  // Safe fallback
  return "hr";
}

function toVitalDoc(id: string, data: any): VitalDoc {
  const type = normalizeVitalType(data?.type);

  return {
    id,
    userId: String(data?.userId ?? ""),
    type,
    timestampMs: Number(data?.timestampMs ?? 0),

    systolic: data?.systolic != null && type === "bp" ? Number(data.systolic) : undefined,
    diastolic: data?.diastolic != null && type === "bp" ? Number(data.diastolic) : undefined,

    value: data?.value != null && type !== "bp" ? Number(data.value) : undefined,

    notes: data?.notes != null ? String(data.notes) : undefined,
    source: (data?.source ?? "manual") as VitalSource,
    createdAtMs: Number(data?.createdAtMs ?? 0),
  };
}

export const vitalsRepository = {
  async addVital(input: AddVitalInput, userIdOverride?: string): Promise<string> {
    const userId = requireUserId(userIdOverride);

    const now = Date.now();
    const timestampMs = input.timestampMs ?? now;
    const createdAtMs = now;

    const source: VitalSource = input.source ?? "manual";
    const cleanNotes = input.notes?.trim() ? input.notes.trim() : null;

    const payload: any = {
      userId,
      type: input.type, // ✅ always write canonical types from the UI
      timestampMs,
      createdAtMs,
      source,
      notes: cleanNotes,

      createdAt: Timestamp.fromMillis(createdAtMs),
      measuredAt: Timestamp.fromMillis(timestampMs),
    };

    if (input.type === "bp") {
      payload.systolic = Number(input.systolic);
      payload.diastolic = Number(input.diastolic);
    } else {
      payload.value = Number((input as any).value);
    }

    const ref = await addDoc(collection(db, VITALS_COL), stripUndefined(payload));
    return ref.id;
  },

  async updateVital(input: UpdateVitalInput): Promise<void> {
    const now = Date.now();
    const timestampMs = input.timestampMs ?? now;
    const source: VitalSource = input.source ?? "manual";
    const cleanNotes = input.notes?.trim() ? input.notes.trim() : null;

    const payload: any = {
      type: input.type,
      timestampMs,
      source,
      notes: cleanNotes,
      measuredAt: Timestamp.fromMillis(timestampMs),
      updatedAt: Timestamp.fromMillis(now),
      updatedAtMs: now,
    };

    if (input.type === "bp") {
      payload.systolic = Number(input.systolic);
      payload.diastolic = Number(input.diastolic);
      // remove value if it exists
      payload.value = undefined;
    } else {
      payload.value = Number((input as any).value);
      // remove bp fields if they exist
      payload.systolic = undefined;
      payload.diastolic = undefined;
    }

    await updateDoc(doc(db, VITALS_COL, input.id), stripUndefined(payload));
  },

  async deleteVital(id: string): Promise<void> {
    await deleteDoc(doc(db, VITALS_COL, id));
  },

  async getHistoryByType(type: VitalType, take: number = 50, userIdOverride?: string): Promise<VitalDoc[]> {
    const userId = requireUserId(userIdOverride);

    const q = query(
      collection(db, VITALS_COL),
      where("userId", "==", userId),
      where("type", "==", type),
      orderBy("timestampMs", "desc"),
      limit(take)
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => toVitalDoc(d.id, d.data()));
  },

  async getRecentAll(take: number = 200, userIdOverride?: string): Promise<VitalDoc[]> {
    const userId = requireUserId(userIdOverride);

    const q = query(
      collection(db, VITALS_COL),
      where("userId", "==", userId),
      orderBy("timestampMs", "desc"),
      limit(take)
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => toVitalDoc(d.id, d.data()));
  },
};
