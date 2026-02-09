// src/features/patient/hooks/useAddSymptom.ts

import { useState } from "react";
import { SymptomEntrySchema, type SymptomEntry } from "../models/patientSchemas";
import { addSymptomEntry } from "../services/patientRepository";

const EMPTY_SYMPTOM: SymptomEntry = {
  description: "",
  intensity: undefined,
  onset: "",
  triggers: "",
  relief: "",
  frequency: "",
  notes: "",
};

export function useAddSymptom(patientId: string) {
  const [symptom, setSymptom] = useState<SymptomEntry>(EMPTY_SYMPTOM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof SymptomEntry>(
    key: K,
    value: SymptomEntry[K]
  ) {
    setSymptom((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveSymptom() {
    try {
      setLoading(true);
      setError(null);

      const validated = SymptomEntrySchema.parse(symptom);

      await addSymptomEntry(patientId, validated);
      setSymptom(EMPTY_SYMPTOM);
    } catch (err: any) {
      console.error("Save symptom error:", err);
      setError(err.message || "Failed to save symptom entry.");
    } finally {
      setLoading(false);
    }
  }

  return {
    symptom,
    setField,
    saveSymptom,
    loading,
    error,
  };
}
