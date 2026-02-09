// src/features/hpi/hooks/useHPIRedFlags.ts

import { useState, useCallback } from "react";
import type { HPIData } from "./useHPI";
import {
  assessHPIRedFlags,
  type HPIRedFlagAssessment,
} from "../services/hpiRedFlagService";

export function useHPIRedFlags(hpi: HPIData) {
  const [assessment, setAssessment] = useState<HPIRedFlagAssessment | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRisk = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await assessHPIRedFlags(hpi);
      setAssessment(result);
    } catch (err: any) {
      console.error("HPI red-flag assessment error:", err);
      setError(err?.message || "Unable to assess red-flag risk.");
    } finally {
      setLoading(false);
    }
  }, [hpi]);

  return {
    assessment,
    loading,
    error,
    refreshRisk,
  };
}
