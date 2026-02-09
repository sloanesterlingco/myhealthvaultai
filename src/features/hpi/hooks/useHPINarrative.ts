// src/features/hpi/hooks/useHPINarrative.ts

import { useState, useCallback } from "react";
import type { HPIData } from "./useHPI";
import { generateHPINarrative } from "../../hpi/services/hpiNarrativeService";

export function useHPINarrative(hpi: HPIData) {
  const [narrative, setNarrative] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshNarrative = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const text = await generateHPINarrative(hpi);
      setNarrative(text);
    } catch (err: any) {
      console.error("HPI narrative error:", err);
      setError(err?.message || "Unable to generate HPI narrative.");
    } finally {
      setLoading(false);
    }
  }, [hpi]);

  return {
    narrative,
    loading,
    error,
    refreshNarrative,
  };
}
