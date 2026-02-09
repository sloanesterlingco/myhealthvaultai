// src/features/patient/hooks/useAddLabResult.ts

import { useState } from "react";
import { LabResultSchema, type LabResult } from "../models/patientSchemas";
import { addLabResult } from "../services/patientRepository";

const EMPTY_LAB: LabResult = {
  name: "",
  value: "",
  units: "",
  referenceRange: "",
  date: "",
  source: "",
  notes: "",
};

export function useAddLabResult(patientId: string) {
  const [lab, setLab] = useState<LabResult>(EMPTY_LAB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof LabResult>(key: K, value: LabResult[K]) {
    setLab((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveLabResult() {
    try {
      setLoading(true);
      setError(null);

      const validated = LabResultSchema.parse(lab);

      await addLabResult(patientId, validated);
      setLab(EMPTY_LAB);
    } catch (err: any) {
      console.error("Save lab result error:", err);
      setError(err.message || "Failed to save lab result.");
    } finally {
      setLoading(false);
    }
  }

  return {
    lab,
    setField,
    saveLabResult,
    loading,
    error,
  };
}
