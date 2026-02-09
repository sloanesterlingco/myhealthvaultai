// src/features/patient/models/MedicationSummary.ts

export interface MedicationSummary {
  id: string;          // required for rendering list items
  name: string;        // FIXED: required, used by UI + PDF
  genericName?: string;
  dose?: string;
  frequency?: string;
}
