// src/features/medications/hooks/useMedicationsList.ts

import { useState, useCallback } from "react";
import type { Medication } from "../../patient/models/patientSchemas";
import { patientService } from "../../../services/patientService";

/**
 * Loads medications for the CURRENT logged-in patient
 * using the global patientService (JS).
 */
export function useMedicationsList(): {
  medications: Medication[];
  loadMedications: () => Promise<void>;
} {
  const [medications, setMedications] = useState<Medication[]>([]);

  const loadMedications = useCallback(async () => {
    try {
      const raw = await patientService.getMedications();

      // patientService is JS, so TS sees "any".
      // Normalize & cast to Medication[]
      const meds = (Array.isArray(raw) ? raw : []) as Medication[];

      setMedications(meds);
    } catch (err) {
      console.warn("Failed to load medications:", err);
      setMedications([]);
    }
  }, []);

  return { medications, loadMedications };
}
