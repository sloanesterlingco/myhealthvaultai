// src/features/patient/hooks/useFamilyHistoryIntake.ts

import { useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { FAMILY_HISTORY_INTAKE_PROMPT } from "../../aiAssistant/prompts/familyHistoryIntakePrompt";
import { addFamilyHistoryItem } from "../services/patientRepository";
import { FamilyHistoryItemSchema } from "../models/patientSchemas";

export function useFamilyHistoryIntake(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitFamilyHistoryFromChat(userMessage: string) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: FAMILY_HISTORY_INTAKE_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      let parsed;
      try {
        parsed = JSON.parse(aiReply);
      } catch {
        throw new Error("The AI did not return valid JSON.");
      }

      const validated = FamilyHistoryItemSchema.parse(parsed);

      const id = await addFamilyHistoryItem(patientId, validated);

      return { success: true, id, data: validated };
    } catch (err: any) {
      console.error("Family history intake error:", err);
      setError(err.message || "Failed to save family history item.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return {
    submitFamilyHistoryFromChat,
    loading,
    error,
  };
}
