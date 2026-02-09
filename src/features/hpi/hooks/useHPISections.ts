// src/features/hpi/hooks/useHPISections.ts

import { useMemo } from "react";
import { HPI_FLOW_CONFIG, HPISectionKey } from "../utils/hpiFlowConfig";
import type { HPIData } from "./useHPI";

export function useHPISections(hpi: HPIData): HPISectionKey[] {
  const complaint = hpi.chiefComplaint?.toLowerCase().trim() ?? "";

  return useMemo(() => {
    if (!complaint) return HPI_FLOW_CONFIG.default.sections;

    // Try to find matching rule
    for (const ruleName of Object.keys(HPI_FLOW_CONFIG)) {
      const rule = HPI_FLOW_CONFIG[ruleName];

      if (rule.keywords.some((kw) => complaint.includes(kw.toLowerCase()))) {
        return rule.sections;
      }
    }

    // No match → use default
    return HPI_FLOW_CONFIG.default.sections;
  }, [complaint]);
}
