// src/features/aiAssistant/hooks/useSymptomPatterns.ts

import { useState } from "react";
import type { PatientProfile } from "../../patient/models/patientSchemas";
import {
  generateSymptomPatterns,
  type SymptomPattern,
} from "../services/symptomPatternService";

export function useSymptomPatterns() {
  const [patterns, setPatterns] = useState<SymptomPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPatterns(profile: PatientProfile) {
    try {
      setLoading(true);
      setError(null);
      const result = await generateSymptomPatterns(profile);
      setPatterns(result.patterns);
      return result.patterns;
    } catch (err: any) {
      console.error("useSymptomPatterns error:", err);
      setError(err.message || "Unable to generate symptom patterns.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  return {
    patterns,
    loading,
    error,
    loadPatterns,
  };
}
