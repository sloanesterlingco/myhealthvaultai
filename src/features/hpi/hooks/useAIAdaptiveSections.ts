// src/features/hpi/hooks/useAIAdaptiveSections.ts

import { useEffect, useState } from "react";
import { useHPISections } from "./useHPISections";
import { getAIRelevantSections } from "../services/aiAdaptiveService";
import type { HPIData } from "./useHPI";
import type { HPISectionKey } from "../utils/hpiFlowConfig";

export function useAIAdaptiveSections(hpi: HPIData) {
  const ruleBased = useHPISections(hpi);
  const [aiSections, setAISections] = useState<HPISectionKey[] | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!hpi.chiefComplaint) {
        setAISections(null);
        return;
      }

      const result = await getAIRelevantSections(hpi);

      // Convert AI strings → HPISectionKey safely
      const valid: HPISectionKey[] = [];
      const allowed: HPISectionKey[] = [
        "chiefComplaint",
        "onset",
        "duration",
        "progression",
        "associatedSymptoms",
        "severity",
        "impactOnLife",
        "treatmentsTried",
      ];

      result.forEach((s) => {
        if (allowed.includes(s as HPISectionKey)) {
          valid.push(s as HPISectionKey);
        }
      });

      setAISections(valid);
    };

    run();
  }, [hpi]);

  // If no AI guidance, use rule-based
  if (!aiSections) return ruleBased;

  // Merge rule-based + AI, preserving order
  const merged: HPISectionKey[] = ruleBased.filter((s) =>
    aiSections.includes(s)
  );

  aiSections.forEach((s) => {
    if (!merged.includes(s)) merged.push(s);
  });

  return merged;
}
