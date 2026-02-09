// src/features/patient/hooks/useAllergyIntake.ts

import { useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { ALLERGY_INTAKE_PROMPT } from "../../aiAssistant/prompts/allergyIntakePrompt";
import { addAllergy } from "../services/patientRepository";
import { AllergySchema } from "../models/patientSchemas";

export function useAllergyIntake(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAllergyFromChat(userMessage: string) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: ALLERGY_INTAKE_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      let parsed;
      try {
        parsed = JSON.parse(aiReply);
      } catch {
        throw new Error("The AI did not return valid JSON.");
      }

      const validated = AllergySchema.parse(parsed);

      const id = await addAllergy(patientId, validated);

      return { success: true, id, data: validated };
    } catch (err: any) {
      console.error("Allergy intake error:", err);
      setError(err.message || "Something went wrong while adding the allergy.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return {
    submitAllergyFromChat,
    loading,
    error,
  };
}
