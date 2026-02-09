// src/features/patient/hooks/useVitalIntake.ts

import { useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { VITAL_INTAKE_PROMPT } from "../../aiAssistant/prompts/vitalIntakePrompt";
import { addVital } from "../services/patientRepository";
import { VitalSchema } from "../models/patientSchemas";

export function useVitalIntake(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitVitalFromChat(userMessage: string) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: VITAL_INTAKE_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      let parsed;
      try {
        parsed = JSON.parse(aiReply);
      } catch {
        throw new Error("The AI did not return valid JSON.");
      }

      const validated = VitalSchema.parse(parsed);

      const id = await addVital(patientId, validated);

      return {
        success: true,
        id,
        data: validated,
      };
    } catch (err: any) {
      console.error("Vital intake error:", err);
      setError(err.message || "Failed to save vital entry.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return { submitVitalFromChat, loading, error };
}
