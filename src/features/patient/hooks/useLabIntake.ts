// src/features/patient/hooks/useLabIntake.ts

import { useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { LAB_INTAKE_PROMPT } from "../../aiAssistant/prompts/labIntakePrompt";
import { LabResultSchema } from "../models/patientSchemas";
import { addLabResult } from "../services/patientRepository";

export function useLabIntake(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLabFromChat(userMessage: string) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: LAB_INTAKE_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      let parsed;
      try {
        parsed = JSON.parse(aiReply);
      } catch {
        throw new Error("The AI did not return valid JSON.");
      }

      const validated = LabResultSchema.parse(parsed);

      const id = await addLabResult(patientId, validated);

      return { success: true, id, data: validated };
    } catch (err: any) {
      console.error("Lab intake error:", err);
      setError(err.message || "Failed to save lab result.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return {
    submitLabFromChat,
    loading,
    error,
  };
}
