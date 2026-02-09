// src/features/hpi/services/hpiRedFlagService.ts

import { aiService } from "../../aiAssistant/services/aiService";
import { HPI_RED_FLAG_PROMPT } from "../prompts/hpiRedFlagPrompt";
import type { HPIData } from "../hooks/useHPI";

export type HPIRiskLevel = "none" | "routine" | "urgentClinic" | "erNow";

export interface HPIRedFlagAssessment {
  riskLevel: HPIRiskLevel;
  reasons: string[];
  recommendation: string;
}

export async function assessHPIRedFlags(
  hpi: HPIData
): Promise<HPIRedFlagAssessment> {
  const reply = await aiService.sendMessage({
    model: "gpt-4.1",
    temperature: 0,
    messages: [
      { role: "system", content: HPI_RED_FLAG_PROMPT },
      {
        role: "user",
        content: JSON.stringify(hpi),
      },
    ],
  });

  try {
    const parsed = JSON.parse(reply);

    const riskLevel: HPIRiskLevel =
      parsed.riskLevel === "erNow" ||
      parsed.riskLevel === "urgentClinic" ||
      parsed.riskLevel === "routine" ||
      parsed.riskLevel === "none"
        ? parsed.riskLevel
        : "none";

    const reasons: string[] = Array.isArray(parsed.reasons)
      ? parsed.reasons.map(String)
      : [];

    const recommendation: string =
      typeof parsed.recommendation === "string"
        ? parsed.recommendation
        : "No specific recommendation.";

    return {
      riskLevel,
      reasons,
      recommendation,
    };
  } catch (err) {
    console.error("HPI red-flag parse error:", err, reply);
    return {
      riskLevel: "none",
      reasons: [],
      recommendation: "Unable to determine red-flag risk from data provided.",
    };
  }
}
