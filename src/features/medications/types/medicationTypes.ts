// src/features/medications/types/medicationTypes.ts

/**
 * V1 Medication Types
 * Storage path:
 *   patients/{uid}/medications/{medicationId}
 *
 * Keep fields flexible + backward-compatible with OCR import + manual entry.
 */

export type MedicationSourceType =
  | "manual"
  | "ocr_label"
  | "ocr_document"
  | "ehr_import"
  | "provider_document";

export type Medication = {
  id: string;

  // Core display fields
  name: string;
  genericName?: string | null;

  // Common medication fields
  dosage?: string | null; // e.g. "10 mg"
  frequency?: string | null; // e.g. "Take 1 tablet twice daily"
  route?: string | null; // e.g. "oral"
  instructions?: string | null; // alias used by some screens
  dose?: string | null; // alias used by some screens

  // Optional metadata
  rxNumber?: string | null;
  pharmacy?: string | null;
  prescriber?: string | null;

  // Lifecycle
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD

  // Provenance (V1)
  source?: "patient_uploaded" | "patient_entered" | "imported" | null;
  sourceType?: MedicationSourceType | null;
  sourceDocId?: string | null;

  // OCR capture (V1)
  ocr?: {
    confidence?: "high" | "medium" | "low";
    rawText?: string;
  } | null;

  // Timestamps
  createdAt: string; // ISO
  updatedAt?: string; // ISO
};

export type MedicationInput = Omit<Medication, "id" | "createdAt" | "updatedAt"> & {
  // Allow minimal creation with just name
  name: string;
};
