// src/features/aiAssistant/services/medicationInteractionsAIService.ts

import { patientService } from "../../../services/patientService";
import { evaluateMedicationInteractions } from "../../medications/services/medicationInteractionEngine";
import type { MedicationForRisk } from "../../medications/services/types";
import { aiService } from "./aiService";

export async function checkMedicationInteractionsWithAI() {
  const list = await patientService.getMedications();
  const meds = Array.isArray(list) ? list : [];

  const medsForRisk: MedicationForRisk[] = meds.map((m: any) => ({
    id: m.id,
    name: m.name,
    genericName: (m.genericName ?? m.name ?? "").toLowerCase(),
  }));

  const interactions = evaluateMedicationInteractions({
    medications: medsForRisk,
  });

  if (interactions.length === 0) {
    return {
      aiText:
        "I didn't find any clinically significant medication interactions in your current list.",
      interactions: [],
    };
  }

  const msg = `
You are a medical assistant helping a patient understand their medication interactions.

Detected interactions:
${JSON.stringify(interactions, null, 2)}

Explain clearly:
- What combinations are interacting
- Why they interact
- Severity (minor, moderate, major)
- Symptoms to monitor
- Recommended lab monitoring
- When to contact a clinician
- Use simple language
- End with: "Do not stop medication without talking to your clinician."
`;

  const aiText = await aiService.sendMessage({
    messages: [{ role: "user", content: msg }],
    model: "gpt-4o-mini",
  });

  return {
    aiText,
    interactions,
  };
}

