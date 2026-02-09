// src/features/patient/hooks/useSymptomIntake.ts

import { useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { SYMPTOM_INTAKE_PROMPT } from "../../aiAssistant/prompts/symptomIntakePrompt";
import { SymptomEntrySchema } from "../models/patientSchemas";
import { addSymptomEntry } from "../services/patientRepository";

export function useSymptomIntake(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitSymptomFromChat(userMessage: string) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: SYMPTOM_INTAKE_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      let parsed: any;
      try {
        parsed = JSON.parse(aiReply);
      } catch {
        throw new Error("The AI did not return valid JSON.");
      }

      // Convert nulls → undefined for optional fields so Zod optional() passes
      const cleaned: any = {};
      for (const [key, value] of Object.entries(parsed)) {
        cleaned[key] = value === null ? undefined : value;
      }

      const validated = SymptomEntrySchema.parse(cleaned);

      const id = await addSymptomEntry(patientId, validated);

      return { success: true, id, data: validated };
    } catch (err: any) {
      console.error("Symptom intake error:", err);
      setError(err.message || "Failed to save symptom entry.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return {
    submitSymptomFromChat,
    loading,
    error,
  };
}
