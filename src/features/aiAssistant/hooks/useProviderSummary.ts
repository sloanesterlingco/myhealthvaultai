// src/features/aiAssistant/hooks/useProviderSummary.ts

import { useState } from "react";
import { aiService } from "../services/aiService";
import { PROVIDER_SUMMARY_PROMPT } from "../prompts/providerSummaryPrompt";
import { PatientProfile } from "../../patient/models/patientSchemas";

export function useProviderSummary() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateSummary(profile: PatientProfile) {
    try {
      setLoading(true);
      setError(null);

      const aiReply = await aiService.sendMessage({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: PROVIDER_SUMMARY_PROMPT },
          { role: "user", content: JSON.stringify(profile) },
        ],
      });

      const parsed = JSON.parse(aiReply);
      setSummary(parsed);

      return parsed;
    } catch (err: any) {
      console.error("Provider summary error:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return {
    generateSummary,
    summary,
    loading,
    error,
  };
}
