// src/models/labEntry.model.ts

/**
 * Firestore model for longitudinal lab tracking
 * Patient-entered / patient-reviewed only
 * No interpretation or reference ranges
 */

import { SupportedLabAnalyte } from "../types/ocrContracts";

export interface LabEntry {
  id: string;

  analyte: SupportedLabAnalyte;
  displayName: string;

  value: number;
  unit: string;

  collectedDate: string; // ISO YYYY-MM-DD
  createdAt: string; // ISO timestamp

  source: "manual" | "ocr" | "voice";
  sourceDocumentId?: string;

  rawText?: string;

  /**
   * User explicitly confirmed accuracy before save
   */
  patientReviewed: true;
}

export interface LabCollection {
  labs: LabEntry[];
}
