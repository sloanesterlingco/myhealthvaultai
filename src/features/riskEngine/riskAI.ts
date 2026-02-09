// src/features/riskEngine/riskAI.ts

import { PatientProfile } from "../patient/models/patientSchemas";
import { aiService } from "../aiAssistant/services/aiService";

const RISK_AI_PROMPT = `
You are an AI clinical safety engine.

Given the patient data, identify potential risk concerns based on pattern analysis.

Output STRICT JSON:

{
  "aiRisks": [
    {
      "level": "GREEN" | "YELLOW" | "RED" | "RED_PLUS",
      "message": string,
      "trigger": string
    }
  ]
}

Rules:
- Do NOT invent lab values.
- Evaluate patterns only.
- If no risks, return aiRisks: [].
`;

export async function evaluateAI(profile: PatientProfile) {
  const reply = await aiService.sendMessage({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: RISK_AI_PROMPT },
      { role: "user", content: JSON.stringify(profile) },
    ],
  });

  return JSON.parse(reply);
}
