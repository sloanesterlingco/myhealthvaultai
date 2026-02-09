// src/features/aiAssistant/services/medicationSafetyAIService.ts

import { buildMedicationSafetyPrompt } from "../prompts/medicationSafetyPrompt";
import { aiService } from "./aiService";
import { MedicationRiskResult } from "../../medications/services/types";

/**
 * Ask the AI: "Is this medication safe?"
 * Uses your real aiService.sendMessage() method.
 */
export async function askMedicationSafetyQuestion(
  medicationName: string,
  risk: MedicationRiskResult
) {
  const prompt = buildMedicationSafetyPrompt(medicationName, risk);

  const response = await aiService.sendMessage({
    messages: [
      {
        role: "system",
        content:
          "You are My Medical Vault AI, a medical guidance assistant who explains medication safety clearly and calmly.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response;
}
