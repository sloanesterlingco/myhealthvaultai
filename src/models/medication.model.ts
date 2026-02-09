// src/models/medication.model.ts

/**
 * Firestore model for patient medication list
 * Derived from OCR, voice, or manual entry
 * Patient-reviewed before persistence
 */

export interface Medication {
  id: string;

  medicationName: string;
  strength?: string;
  form?: string;

  sig?: string; // free text directions
  fillDate?: string; // ISO date

  prescriber?: string;
  pharmacy?: string;
  rxNumber?: string;

  active: boolean;

  createdAt: string; // ISO timestamp
  updatedAt?: string;

  source: "manual" | "ocr" | "voice";
  sourceDocumentId?: string;

  rawText?: string;

  /**
   * User explicitly confirmed accuracy before save
   */
  patientReviewed: true;
}

export interface MedicationCollection {
  medications: Medication[];
}