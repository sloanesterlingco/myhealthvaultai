// src/models/document.model.ts

/**
 * Stored source documents for OCR ingestion
 * Images, PDFs, screenshots
 */

export type DocumentType =
  | "lab_report"
  | "medication_label"
  | "imaging_report"
  | "other";

export interface SourceDocument {
  id: string;

  type: DocumentType;
  fileName?: string;
  mimeType: string;

  createdAt: string; // ISO timestamp

  /**
   * Secure storage path (Firebase Storage)
   * Firestore stores reference only
   */
  storagePath: string;

  /**
   * Full OCR text for audit + user trust
   */
  rawText?: string;
}
