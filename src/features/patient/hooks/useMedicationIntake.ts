// src/features/patient/hooks/useMedicationIntake.ts

import { useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { MEDICATION_INTAKE_PROMPT } from "../../aiAssistant/prompts/medicationIntakePrompt";
import { addMedication } from "../services/patientRepository";
import { MedicationSchema } from "../models/patientSchemas";

export function useMedicationIntake(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitMedicationFromChat(userMessage: string) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: MEDICATION_INTAKE_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      let parsed;
      try {
        parsed = JSON.parse(aiReply);
      } catch {
        throw new Error("The AI did not return valid JSON.");
      }

      const validated = MedicationSchema.parse(parsed);

      const id = await addMedication(patientId, validated);

      return { success: true, id, data: validated };
    } catch (err: any) {
      console.error("Medication intake error:", err);
      setError(err.message || "Something went wrong during medication intake.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return {
    submitMedicationFromChat,
    loading,
    error,
  };
}
