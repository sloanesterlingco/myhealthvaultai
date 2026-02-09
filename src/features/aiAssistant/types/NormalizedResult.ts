// src/features/aiAssistant/types/NormalizedResult.ts

export interface NormalizedCode {
  system: string;      // ICD-10 | SNOMED | HCPCS | CPT
  code: string;
  description: string;
  confidence: number;
}

export type NormalizedCategory =
  | "condition"
  | "procedure"
  | "imaging"
  | "symptom";

export interface NormalizedResult {
  category: NormalizedCategory;
  normalizedText: string;
  codes: NormalizedCode[];
}
