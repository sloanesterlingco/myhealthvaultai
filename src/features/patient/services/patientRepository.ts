// src/features/patient/services/patientRepository.ts

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import { db } from "../../../lib/firebase";
import { ZodSchema } from "zod";

import {
  PatientCoreSchema,
  PatientProfileSchema,
  ConditionSchema,
  MedicationSchema,
  AllergySchema,
  SurgerySchema,
  FamilyHistoryItemSchema,
  LabResultSchema,
  VitalSchema,
  SymptomEntrySchema,
  type PatientCore,
  type PatientProfile,
  type Condition,
  type Medication,
  type Allergy,
  type Surgery,
  type FamilyHistoryItem,
  type LabResult,
  type Vital,
  type SymptomEntry,
} from "../models/patientSchemas";

// Root Firestore collection
const PATIENTS_COLLECTION = "patients";

/** Build a ref to: patients/{patientId} */
function patientDocRef(patientId: string) {
  return doc(db, PATIENTS_COLLECTION, patientId);
}

/** Build a ref to a subcollection: patients/{patientId}/{sub} */
function patientSubcollectionRef(patientId: string, sub: string) {
  return collection(db, PATIENTS_COLLECTION, patientId, sub);
}

/**
 * Firestore can return Timestamp objects (especially from serverTimestamp or older builds).
 * Our Zod schemas expect numbers for createdAt/updatedAt/etc.
 * This normalizes Timestamp-like values AND common date-ish string fields to millis BEFORE Zod parsing.
 */
function isTimestampLike(v: any): boolean {
  if (!v || typeof v !== "object") return false;
  if (typeof v.toMillis === "function") return true; // Firestore Timestamp
  if (typeof v.seconds === "number") return true; // Timestamp-like shape
  return false;
}

function timestampToMillis(v: any): number | undefined {
  try {
    if (v === null || v === undefined) return undefined;

    // number already
    if (typeof v === "number" && Number.isFinite(v)) return v;

    // string: numeric millis OR ISO date string
    if (typeof v === "string") {
      const asNum = Number(v);
      if (Number.isFinite(asNum)) return asNum;

      const t = Date.parse(v);
      return Number.isFinite(t) ? t : undefined;
    }

    // Firestore Timestamp
    if (typeof v?.toMillis === "function") return v.toMillis();

    // Timestamp-like shape
    if (typeof v?.seconds === "number") return v.seconds * 1000;

    return undefined;
  } catch {
    return undefined;
  }
}

function normalizeFirestoreValues<T = any>(value: T): T {
  // Convert Timestamp-like objects to millis
  if (isTimestampLike(value)) {
    return (timestampToMillis(value) as any) ?? (value as any);
  }

  // Arrays: normalize entries
  if (Array.isArray(value)) {
    return value.map((v) => normalizeFirestoreValues(v)) as any;
  }

  // Objects: normalize keys
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as any)) {
      const isDateKey =
        k === "createdAt" ||
        k === "updatedAt" ||
        k === "timestamp" ||
        k === "timestampMs";

      if (isTimestampLike(v)) {
        out[k] = timestampToMillis(v) ?? v;
      } else if (isDateKey && (typeof v === "string" || typeof v === "number")) {
        // ✅ Convert date-ish strings and numeric strings for common time fields
        out[k] = timestampToMillis(v) ?? v;
      } else {
        out[k] = normalizeFirestoreValues(v);
      }
    }
    return out as any;
  }

  return value;
}

////////////////////////////////////////////////////////////////////////////////
// PATIENT CORE
////////////////////////////////////////////////////////////////////////////////

/** Upsert patient core profile */
export async function upsertPatientCore(
  patientId: string,
  core: Partial<PatientCore>
): Promise<void> {
  const parsed = PatientCoreSchema.parse({
    ...core,
    id: patientId,
    updatedAt: Date.now(),
  });

  await setDoc(
    patientDocRef(patientId),
    {
      ...parsed,
      createdAt: parsed.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/** Load patient core */
export async function getPatientCore(
  patientId: string
): Promise<PatientCore | null> {
  const snap = await getDoc(patientDocRef(patientId));
  if (!snap.exists()) return null;

  const normalized = normalizeFirestoreValues(snap.data());
  return PatientCoreSchema.parse(normalized);
}

////////////////////////////////////////////////////////////////////////////////

function deepStripUndefined(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    // Keep array shape but strip undefined entries (Firestore rejects undefined anywhere)
    return value.map((v) => deepStripUndefined(v)).filter((v) => v !== undefined);
  }

  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = deepStripUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  return value;
}

// GENERIC HELPERS — Firestore + Zod
////////////////////////////////////////////////////////////////////////////////

/**
 * Create a new document in a subcollection.
 * T must be a record-like object to satisfy Firestore.
 */
async function addSubItem<T extends Record<string, any>>(
  patientId: string,
  subcollection: string,
  schema: ZodSchema<T>,
  item: Partial<T>
): Promise<string> {
  const now = Date.now();

  // Firestore rejects undefined anywhere, so strip it before and after validation.
  const preClean = deepStripUndefined({
    ...(item as Record<string, any>),
    createdAt: now,
    updatedAt: now,
  });

  const parsed = schema.parse(preClean as any) as T;
  const cleaned = deepStripUndefined(parsed) as Record<string, any>;

  // Avoid addDoc -> updateDoc pattern; create doc id first and write once.
  const colRef = patientSubcollectionRef(patientId, subcollection);
  const docRef = doc(colRef);

  await setDoc(docRef, { id: docRef.id, ...cleaned });
  return docRef.id;
}

/**
 * Load all documents from a subcollection.
 * Normalizes Firestore Timestamp values and common date-ish strings to millis before Zod parse.
 */
async function listSubItems<T extends Record<string, any>>(
  patientId: string,
  subcollection: string,
  schema: ZodSchema<T>
): Promise<T[]> {
  try {
    const snap = await getDocs(patientSubcollectionRef(patientId, subcollection));
    const results: T[] = [];

    snap.forEach((d) => {
      const raw = { id: d.id, ...(d.data() as any) };
      const normalized = normalizeFirestoreValues(raw);
      const parsed = schema.parse(normalized as Record<string, any>) as T;
      results.push(parsed);
    });

    return results;
  } catch (e: any) {
    const code = e?.code ? String(e.code) : "";
    const msg = e?.message ? String(e.message) : String(e);
    const wrapped = new Error(
      `patientRepository.listSubItems failed: patients/${patientId}/${subcollection}\n` +
        (code ? `code: ${code}\n` : "") +
        `message: ${msg}`
    );
    (wrapped as any).cause = e;
    throw wrapped;
  }
}

////////////////////////////////////////////////////////////////////////////////
// CONDITIONS
////////////////////////////////////////////////////////////////////////////////

export async function addCondition(
  patientId: string,
  condition: Partial<Condition>
): Promise<string> {
  return addSubItem<Condition>(patientId, "conditions", ConditionSchema, condition);
}

export async function listConditions(patientId: string): Promise<Condition[]> {
  return listSubItems<Condition>(patientId, "conditions", ConditionSchema);
}

////////////////////////////////////////////////////////////////////////////////
// MEDICATIONS
////////////////////////////////////////////////////////////////////////////////

export async function addMedication(
  patientId: string,
  medication: Partial<Medication>
): Promise<string> {
  return addSubItem<Medication>(patientId, "medications", MedicationSchema, medication);
}

export async function listMedications(patientId: string): Promise<Medication[]> {
  return listSubItems<Medication>(patientId, "medications", MedicationSchema);
}

////////////////////////////////////////////////////////////////////////////////
// ALLERGIES
////////////////////////////////////////////////////////////////////////////////

export async function addAllergy(
  patientId: string,
  allergy: Partial<Allergy>
): Promise<string> {
  return addSubItem<Allergy>(patientId, "allergies", AllergySchema, allergy);
}

export async function listAllergies(patientId: string): Promise<Allergy[]> {
  return listSubItems<Allergy>(patientId, "allergies", AllergySchema);
}

////////////////////////////////////////////////////////////////////////////////
// SURGERIES
////////////////////////////////////////////////////////////////////////////////

export async function addSurgery(
  patientId: string,
  surgery: Partial<Surgery>
): Promise<string> {
  return addSubItem<Surgery>(patientId, "surgeries", SurgerySchema, surgery);
}

export async function listSurgeries(patientId: string): Promise<Surgery[]> {
  return listSubItems<Surgery>(patientId, "surgeries", SurgerySchema);
}

////////////////////////////////////////////////////////////////////////////////
// FAMILY HISTORY
////////////////////////////////////////////////////////////////////////////////

export async function addFamilyHistoryItem(
  patientId: string,
  item: Partial<FamilyHistoryItem>
): Promise<string> {
  return addSubItem<FamilyHistoryItem>(patientId, "familyHistory", FamilyHistoryItemSchema, item);
}

export async function listFamilyHistory(patientId: string): Promise<FamilyHistoryItem[]> {
  return listSubItems<FamilyHistoryItem>(patientId, "familyHistory", FamilyHistoryItemSchema);
}

////////////////////////////////////////////////////////////////////////////////
// LAB RESULTS
////////////////////////////////////////////////////////////////////////////////

export async function addLabResult(
  patientId: string,
  lab: Partial<LabResult>
): Promise<string> {
  return addSubItem<LabResult>(patientId, "labs", LabResultSchema, lab);
}

export async function listLabResults(patientId: string): Promise<LabResult[]> {
  return listSubItems<LabResult>(patientId, "labs", LabResultSchema);
}

////////////////////////////////////////////////////////////////////////////////
// VITALS
////////////////////////////////////////////////////////////////////////////////

export async function addVital(
  patientId: string,
  vital: Partial<Vital>
): Promise<string> {
  return addSubItem<Vital>(patientId, "vitals", VitalSchema, vital);
}

export async function listVitals(patientId: string): Promise<Vital[]> {
  return listSubItems<Vital>(patientId, "vitals", VitalSchema);
}

////////////////////////////////////////////////////////////////////////////////
// SYMPTOMS
////////////////////////////////////////////////////////////////////////////////

export async function addSymptomEntry(
  patientId: string,
  symptom: Partial<SymptomEntry>
): Promise<string> {
  return addSubItem<SymptomEntry>(patientId, "symptoms", SymptomEntrySchema, symptom);
}

export async function listSymptomEntries(patientId: string): Promise<SymptomEntry[]> {
  return listSubItems<SymptomEntry>(patientId, "symptoms", SymptomEntrySchema);
}

////////////////////////////////////////////////////////////////////////////////
// FULL PATIENT PROFILE
////////////////////////////////////////////////////////////////////////////////

export async function getPatientProfile(
  patientId: string
): Promise<PatientProfile | null> {
  const core = await getPatientCore(patientId);
  if (!core) return null;

  const [conditions, medications, allergies, surgeries, familyHistory, labs, vitals, symptoms] =
    await Promise.all([
      listConditions(patientId),
      listMedications(patientId),
      listAllergies(patientId),
      listSurgeries(patientId),
      listFamilyHistory(patientId),
      listLabResults(patientId),
      listVitals(patientId),
      listSymptomEntries(patientId),
    ]);

  return PatientProfileSchema.parse({
    core,
    conditions,
    medications,
    allergies,
    surgeries,
    familyHistory,
    labs,
    vitals,
    symptoms,
  });
}
