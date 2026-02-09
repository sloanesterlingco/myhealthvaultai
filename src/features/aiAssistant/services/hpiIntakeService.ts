// src/features/aiAssistant/services/hpiIntakeService.ts

import { aiService } from "./aiService";
import { HPI_INTAKE_PROMPT } from "../prompts/hpiIntakePrompt";
import type { HPIData } from "../../hpi/hooks/useHPI";

export interface HPIIntakeRequest {
  freeText: string;
  age?: number;
  sex?: string;
}

/**
 * Calls the AI HPI intake engine and returns a Partial<HPIData>.
 * The caller is responsible for merging this into the existing HPI state.
 */
export async function generateHPIFromFreeText(
  request: HPIIntakeRequest
): Promise<Partial<HPIData>> {
  const reply = await aiService.sendMessage({
    model: "gpt-4.1",
    temperature: 0.2,
    messages: [
      { role: "system", content: HPI_INTAKE_PROMPT },
      {
        role: "user",
        content: JSON.stringify(request),
      },
    ],
  });

  let parsed: any;
  try {
    parsed = JSON.parse(reply);
  } catch (err) {
    console.error("Failed to parse HPI intake AI reply:", err, reply);
    throw new Error("HPI intake engine returned invalid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("HPI intake engine returned an invalid object.");
  }

  // Very light validation: only keep known keys
  const result: Partial<HPIData> = {};

  if (typeof parsed.chiefComplaint === "string") {
    result.chiefComplaint = parsed.chiefComplaint;
  }

  if (parsed.onset && typeof parsed.onset === "object") {
    result.onset = {
      onsetType: String(parsed.onset.onsetType ?? ""),
      onsetDate: String(parsed.onset.onsetDate ?? ""),
      onsetTrigger: String(parsed.onset.onsetTrigger ?? ""),
    };
  }

  if (typeof parsed.duration === "string") {
    result.duration = parsed.duration;
  }

  if (typeof parsed.progression === "string") {
    result.progression = parsed.progression;
  }

  if (Array.isArray(parsed.associatedSymptoms)) {
    result.associatedSymptoms = parsed.associatedSymptoms.map(String);
  }

  if (typeof parsed.severity === "string") {
    result.severity = parsed.severity;
  }

  if (Array.isArray(parsed.impactOnLife)) {
    result.impactOnLife = parsed.impactOnLife.map(String);
  }

  if (Array.isArray(parsed.treatmentsTried)) {
    result.treatmentsTried = parsed.treatmentsTried.map(String);
  }

  return result;
}
