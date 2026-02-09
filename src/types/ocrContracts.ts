// src/types/ocrContracts.ts

/**
 * OCR extraction contracts for MyHealthVaultAI v1
 * Purpose:
 * - Structured capture only
 * - Patient review required before save
 * - No interpretation, no reference ranges, no diagnostics
 */

/* =========================
   SHARED BASE TYPES
========================= */

export type OCRSourceType =
  | "image"
  | "pdf"
  | "camera"
  | "screenshot"
  | "unknown";

export interface OCRBaseResult {
  sourceType: OCRSourceType;
  rawText: string;
  confidence?: number; // 0–1 best-effort
}

/* =========================
   LABS (LONGITUDINAL)
========================= */

export type SupportedLabAnalyte =
  | "hemoglobin_a1c"
  | "ldl"
  | "hdl"
  | "total_cholesterol"
  | "creatinine"
  | "egfr"
  | "tsh";

export interface OCRLabValue {
  analyte: SupportedLabAnalyte;
  displayName: string; // e.g. "Hemoglobin A1c"
  value: number | null;
  unit: string | null;
  collectedDate: string | null; // ISO date, user-editable
  detected: boolean; // false if AI unsure
}

export interface OCRLabResult extends OCRBaseResult {
  type: "lab";
  labs: OCRLabValue[];
}

/* =========================
   MEDICATIONS
========================= */

export interface OCRMedicationDraft {
  medicationName: string | null;
  strength: string | null; // "10 mg"
  form: string | null; // tablet, capsule, etc
  sig: string | null; // free text directions
  fillDate: string | null; // ISO date
  prescriber: string | null;
  pharmacy: string | null;
  rxNumber: string | null;
  detected: boolean;
}

export interface OCRMedicationResult extends OCRBaseResult {
  type: "medication";
  medication: OCRMedicationDraft;
}

/* =========================
   UNION
========================= */

export type OCRResult = OCRLabResult | OCRMedicationResult;
