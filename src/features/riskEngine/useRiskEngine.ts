// src/features/riskEngine/useRiskEngine.ts

import { useState } from "react";
import { evaluateRisk } from "./riskEngine";
import { PatientProfile } from "../patient/models/patientSchemas";

export function useRiskEngine() {
  const [loading, setLoading] = useState(false);
  const [risk, setRisk] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function runRiskEngine(profile: PatientProfile) {
    try {
      setLoading(true);
      setError(null);

      const result = await evaluateRisk(profile);
      setRisk(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { runRiskEngine, loading, risk, error };
}
