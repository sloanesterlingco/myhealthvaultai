// src/features/patient/hooks/useSocialHistoryIntake.ts

import { useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { SOCIAL_HISTORY_INTAKE_PROMPT } from "../../aiAssistant/prompts/socialHistoryIntakePrompt";
import { SocialHistorySchema } from "../models/patientSchemas";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export function useSocialHistoryIntake(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitSocialHistoryFromChat(userMessage: string) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: SOCIAL_HISTORY_INTAKE_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      let parsed;
      try {
        parsed = JSON.parse(aiReply);
      } catch {
        throw new Error("The AI did not return valid JSON.");
      }

      const validated = SocialHistorySchema.parse(parsed);

      // Save directly into patients/{id}.socialHistory
      const ref = doc(db, "patients", patientId);
      await updateDoc(ref, {
        socialHistory: {
          ...validated,
          updatedAt: Date.now(),
        },
      });

      return { success: true, data: validated };
    } catch (err: any) {
      console.error("Social history intake error:", err);
      setError(err.message || "Failed to save social history.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return {
    submitSocialHistoryFromChat,
    loading,
    error,
  };
}
