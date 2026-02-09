// src/features/aiAssistant/services/chartSetupService.ts

import { promptBuilders } from "../utils/promptBuilders";
import { aiService } from "./aiService";
import { patientAggregationService } from "./patientAggregationService";
import type { ChartSetupMessage } from "../hooks/useAIChartSetup";

/**
 * chartSetupService
 * -----------------
 * Handles the AI-driven "Chart Setup Wizard".
 *
 * Alpha reliability upgrades:
 * - Parses the new strict envelope from promptBuilders.chartSetupParseResponse:
 *   { data: {...}, warnings: [], missingRequired: [] }
 * - Adds a self-contained JSON repair prompt (no dependency on promptBuilders having it)
 * - Always updates patientAggregationService with the *data* object only
 */

type ChartSetupEnvelope = {
  data: {
    demographics?: Record<string, any>;
    medications?: any[];
    allergies?: any[];
    conditions?: any[];
    surgeries?: any[];
    familyHistory?: any[];
    socialHistory?: Record<string, any>;
  };
  warnings?: string[];
  missingRequired?: string[];
};

const safeJsonParse = (text: string): any | null => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const normalizeEnvelope = (raw: any): ChartSetupEnvelope | null => {
  if (!raw || typeof raw !== "object") return null;

  // If model returned the envelope shape
  if (raw.data && typeof raw.data === "object") {
    const data = raw.data ?? {};
    return {
      data: {
        demographics: data.demographics ?? {},
        medications: Array.isArray(data.medications) ? data.medications : [],
        allergies: Array.isArray(data.allergies) ? data.allergies : [],
        conditions: Array.isArray(data.conditions) ? data.conditions : [],
        surgeries: Array.isArray(data.surgeries) ? data.surgeries : [],
        familyHistory: Array.isArray(data.familyHistory) ? data.familyHistory : [],
        socialHistory: data.socialHistory && typeof data.socialHistory === "object" ? data.socialHistory : {},
      },
      warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
      missingRequired: Array.isArray(raw.missingRequired) ? raw.missingRequired : [],
    };
  }

  // Back-compat: if model returned the old shape directly, wrap it
  const looksLikeOldShape =
    "demographics" in raw ||
    "medications" in raw ||
    "allergies" in raw ||
    "conditions" in raw ||
    "surgeries" in raw ||
    "familyHistory" in raw ||
    "socialHistory" in raw;

  if (looksLikeOldShape) {
    return {
      data: {
        demographics: raw.demographics ?? {},
        medications: Array.isArray(raw.medications) ? raw.medications : [],
        allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
        conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
        surgeries: Array.isArray(raw.surgeries) ? raw.surgeries : [],
        familyHistory: Array.isArray(raw.familyHistory) ? raw.familyHistory : [],
        socialHistory: raw.socialHistory && typeof raw.socialHistory === "object" ? raw.socialHistory : {},
      },
      warnings: [],
      missingRequired: [],
    };
  }

  return null;
};

const buildRepairPrompt = (badOutput: string): string => {
  // Keep this prompt extremely strict to maximize valid JSON return rates.
  return `
You repair AI outputs into valid JSON.

INPUT (may contain invalid JSON, markdown, or extra text):
${badOutput}

OUTPUT RULES (VERY IMPORTANT):
- Output MUST be valid JSON.
- Output MUST be a single JSON object.
- Output MUST NOT include markdown, backticks, comments, or extra text.
- Output MUST have EXACTLY these top-level keys: "data", "warnings", "missingRequired"
- Do NOT add any other keys.

Return EXACTLY this shape:

{
  "data": {
    "demographics": {},
    "medications": [],
    "allergies": [],
    "conditions": [],
    "surgeries": [],
    "familyHistory": [],
    "socialHistory": {}
  },
  "warnings": [],
  "missingRequired": []
}

If you cannot recover any structured data, return the same shape with all empty values.
    `.trim();
};

export const chartSetupService = {
  /**
   * Generates the first message of the chart setup workflow.
   */
  getIntroMessage(): ChartSetupMessage {
    return {
      role: "assistant",
      content:
        "Hi! I’m your AI assistant. I'll help you quickly set up your medical chart so your providers have everything they need. Ready to begin?",
    };
  },

  /**
   * Ask AI what question should come next
   */
  async getNextQuestion(currentPatientState: any): Promise<string> {
    const prompt = promptBuilders.chartSetupNextQuestion(currentPatientState);

    const response: string = await aiService.sendMessage({
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3,
    });

    return response;
  },

  /**
   * Parse user's free text into structured patient data
   */
  async parseUserResponse(userText: string): Promise<ChartSetupEnvelope | null> {
    const prompt = promptBuilders.chartSetupParseResponse(userText);

    const result: string = await aiService.sendMessage({
      messages: [{ role: "system", content: prompt }],
      temperature: 0,
    });

    // 1) First attempt: direct JSON parse
    let parsedRaw = safeJsonParse(result);
    let envelope = normalizeEnvelope(parsedRaw);

    // 2) Repair pass if invalid JSON or wrong shape
    if (!envelope) {
      const repairPrompt = buildRepairPrompt(result);
      const repaired: string = await aiService.sendMessage({
        messages: [{ role: "system", content: repairPrompt }],
        temperature: 0,
      });

      parsedRaw = safeJsonParse(repaired);
      envelope = normalizeEnvelope(parsedRaw);
    }

    if (!envelope) {
      console.log("Invalid JSON from chart setup AI (even after repair):", result);
      return null;
    }

    // IMPORTANT: update patientAggregationService with only the structured chart data,
    // not warnings/missingRequired envelope fields.
    patientAggregationService.updatePatientData(envelope.data);

    return envelope;
  },

  /**
   * Check if chart is complete
   */
  isChartComplete(patientState: any): boolean {
    // Required sections; treat arrays as complete if they have length > 0,
    // treat objects as complete if they have at least one key.
    const required = [
      "demographics",
      "conditions",
      "medications",
      "allergies",
      "surgeries",
      "familyHistory",
      "socialHistory",
    ];

    return required.every((key) => {
      const section = patientState?.[key];

      if (!section) return false;

      if (Array.isArray(section)) return section.length > 0;

      if (typeof section === "object") return Object.keys(section).length > 0;

      return false;
    });
  },

  /**
   * Generate provider summary
   */
  async generateProviderSummary(patientState: any): Promise<string> {
    const prompt = promptBuilders.providerSummary(patientState);

    const response: string = await aiService.sendMessage({
      messages: [{ role: "system", content: prompt }],
      temperature: 0.2,
      model: "gpt-4.1",
    });

    return response;
  },
};
