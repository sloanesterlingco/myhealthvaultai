// src/features/hpi/services/aiAdaptiveService.ts

import { aiService } from "../../aiAssistant/services/aiService";
import { AI_ADAPTIVE_PROMPT } from "../prompts/aiAdaptivePrompt";
import type { HPIData } from "../hooks/useHPI";

export async function getAIRelevantSections(
  hpi: HPIData
): Promise<string[]> {
  const input = {
    chiefComplaint: hpi.chiefComplaint,
    onset: hpi.onset,
    duration: hpi.duration,
    progression: hpi.progression,
    associatedSymptoms: hpi.associatedSymptoms,
    severity: hpi.severity,
    impactOnLife: hpi.impactOnLife,
    treatmentsTried: hpi.treatmentsTried,
  };

  const reply = await aiService.sendMessage({
    model: "gpt-4.1",
    temperature: 0,
    messages: [
      { role: "system", content: AI_ADAPTIVE_PROMPT },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  try {
    const parsed = JSON.parse(reply);
    if (Array.isArray(parsed.sections)) {
      return parsed.sections.map(String);
    }
  } catch (err) {
    console.error("AI adaptive parse error:", err, reply);
  }

  // Safe fallback
  return ["chiefComplaint", "onset", "duration"];
}
