// src/features/aiAssistant/services/providerSummaryService.ts

import { getPatientProfile } from "../../patient/services/patientRepository";
import { aiService } from "./aiService";
import { PROVIDER_SUMMARY_PROMPT } from "../prompts/providerSummaryPrompt";

export async function buildProviderSummary(patientId: string) {
  const profile = await getPatientProfile(patientId);
  if (!profile) throw new Error("Patient profile not found.");

  const response = await aiService.sendMessage({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: PROVIDER_SUMMARY_PROMPT },
      { role: "user", content: JSON.stringify(profile) },
    ],
  });

  return JSON.parse(response);
}
