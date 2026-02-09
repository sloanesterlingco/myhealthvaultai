// src/features/aiAssistant/hooks/useAIPatientProfile.ts

import { useState } from "react";
import { aiService } from "../services/aiService";
import { patientAggregationService } from "../services/patientAggregationService";
import { promptBuilders } from "../utils/promptBuilders";
import type { AIChatMessage } from "../services/aiService";
import type { PatientAggregationModel } from "../services/patientAggregationService";

/**
 * useAIPatientProfile
 * -------------------------------------------------
 * Allows the AI to:
 * - read full patient chart
 * - generate summaries
 * - extract structured updates from text
 */

export const useAIPatientProfile = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const getPatientState = (): PatientAggregationModel =>
    patientAggregationService.getPatient();

  /**
   * Generate a provider-facing profile summary
   */
  const generateProfileSummary = async (): Promise<string> => {
    setLoading(true);

    try {
      const prompt = promptBuilders.providerSummary(getPatientState());

      const messages: AIChatMessage[] = [
        { role: "system", content: prompt },
      ];

      const response = await aiService.sendMessage({
        messages,
        temperature: 0.3,
        model: "gpt-4.1",
      });

      return response;
    } catch (err) {
      console.log("AI profile summary error:", err);
      return "I wasn't able to generate a summary. Please try again.";
    } finally {
      setLoading(false);
    }
  };

  /**
   * Extract structured data from free text:
   * - meds
   * - allergies
   * - conditions
   * - surgeries
   * - social history
   */
  const updateProfileFromText = async (
    userText: string
  ): Promise<any | null> => {
    setLoading(true);

    try {
      const parsePrompt = promptBuilders.chartSetupParseResponse(userText);

      const messages: AIChatMessage[] = [
        { role: "system", content: parsePrompt },
      ];

      const result = await aiService.sendMessage({
        messages,
        temperature: 0.2,
      });

      let parsed: any;

      try {
        parsed = JSON.parse(result);
      } catch {
        console.log("Profile update JSON parse failed:", result);
        return null;
      }

      patientAggregationService.updatePatientData(parsed);

      return parsed;
    } catch (err) {
      console.log("AI profile update error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getPatientState,
    generateProfileSummary,
    updateProfileFromText,
  };
};
