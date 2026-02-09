// src/features/aiAssistant/services/symptomPatternService.ts
import { chartSetupNext } from "./aiService";

export type SymptomPatternResult = {
  summary: string;
  patterns: string[];
  redFlags: string[];
  questions: string[];
};

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function generateSymptomPatterns(profile: any): Promise<SymptomPatternResult> {
  // We reuse the same backend AI route you already have wired (chartSetupNext)
  // and ask it to return JSON.

  const prompt = `
You are a medical note organizer. Do NOT give medical advice.
Given this profile JSON, extract symptom patterns and organize them.

Return ONLY strict JSON in this schema:
{
  "summary": string,
  "patterns": string[],
  "redFlags": string[],
  "questions": string[]
}

Profile JSON:
${JSON.stringify(profile ?? {}, null, 2)}
`.trim();

  const resp = await chartSetupNext({
    messages: [{ role: "user", content: prompt }],
    chartSetup: {},
  } as any);

  const text = String(resp?.reply ?? "").trim();

  // Try parse
  const parsed = safeJsonParse<SymptomPatternResult>(text);
  if (parsed && typeof parsed.summary === "string") return parsed;

  // Fallback if model returns non-json
  return {
    summary: text || "No summary returned.",
    patterns: [],
    redFlags: [],
    questions: [],
  };
}
