// src/features/ocr/OCRReviewTypes.ts

/**
 * Shared review-layer types for OCR results
 * Used by both Labs and Medications review screens
 */

import {
  OCRLabResult,
  OCRMedicationResult,
} from "../../types/ocrContracts";

export type OCRReviewMode = "lab" | "medication";

export interface OCRReviewState {
  mode: OCRReviewMode;
  labResult?: OCRLabResult;
  medicationResult?: OCRMedicationResult;

  /**
   * True only after user explicitly confirms
   */
  confirmed: boolean;
}
