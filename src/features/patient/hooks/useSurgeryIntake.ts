// src/features/patient/hooks/useSurgeryIntake.ts

import { useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { SURGERY_INTAKE_PROMPT } from "../../aiAssistant/prompts/surgeryIntakePrompt";
import { addSurgery } from "../services/patientRepository";
import { SurgerySchema } from "../models/patientSchemas";

export function useSurgeryIntake(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitSurgeryFromChat(userMessage: string) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: SURGERY_INTAKE_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      let parsed: unknown;
      try {
        parsed = JSON.parse(aiReply);
      } catch {
        throw new Error("The AI did not return valid JSON.");
      }

      const validated = SurgerySchema.parse(parsed);

      const id = await addSurgery(patientId, validated);

      return { success: true, id, data: validated };
    } catch (err: any) {
      console.error("Surgery intake error:", err);
      setError(err.message || "Something went wrong while adding the surgery.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return {
    submitSurgeryFromChat,
    loading,
    error,
  };
}
