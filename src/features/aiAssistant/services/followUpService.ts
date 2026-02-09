// src/features/aiAssistant/services/followUpService.ts
import { sendChat, type ChatTurn } from "./aiService";
import type { PatientAggregationModel } from "./patientAggregationService";

export type FollowUpPayload = {
  trackSymptoms: string[];
  addConcerns: string[];
  suggestGoals: string[];
  flagProviderTopics: string[];
  riskWarnings: string[];
};

const emptyPayload = (): FollowUpPayload => ({
  trackSymptoms: [],
  addConcerns: [],
  suggestGoals: [],
  flagProviderTopics: [],
  riskWarnings: [],
});

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const buildFollowUpPrompt = (userText: string, patientState: PatientAggregationModel) => `
You are an AI Follow-Up Agent assisting a patient after each message.

Your job:
Analyze the message, the patient's chart, and the AI memory section.
Recommend simple follow-up actions the assistant can suggest.

Patient chart + memory:
${JSON.stringify(patientState, null, 2)}

User message:
"${userText}"

Extract follow-up suggestions into JSON:

{
  "trackSymptoms": [],        // symptoms to start tracking
  "addConcerns": [],          // concerns to store for future visits
  "suggestGoals": [],         // health goals the user may want to set
  "flagProviderTopics": [],   // things worth discussing with a provider
  "riskWarnings": []          // any mild safety flags (no diagnoses!)
}

Guidelines:
- Be conservative and medically safe.
- Only add items that are truly appropriate.
- Use the patient's aiMemory to avoid duplicates.
- Suggest tracking only if a symptom is new OR recurring.
- Suggest concerns only if explicitly expressed.
- Suggest goals only if relevant and actionable.
- Flag provider topics only for clinically meaningful items.
- Keep riskWarnings mild and safe (e.g. “If this gets worse, consider urgent care.”)
- NEVER diagnose.
- NEVER mention internal data structures or memory explicitly.

Return ONLY valid JSON.
`.trim();

export const followUpService = {
  async getFollowUps(userText: string, patientState: PatientAggregationModel): Promise<FollowUpPayload | null> {
    try {
      const prompt = buildFollowUpPrompt(userText, patientState);

      // We call a backend route that *must* return strict JSON content.
      const turns: ChatTurn[] = [{ role: "system", content: prompt }];

      const replyTurns = await sendChat("/ai/followups", turns);

      const assistant = [...replyTurns].reverse().find((m) => m.role === "assistant");
      const content = String(assistant?.content ?? "").trim();
      if (!content) return null;

      const parsed = safeParseJson<FollowUpPayload>(content);
      if (!parsed) return null;

      // Defensive normalization
      const out = emptyPayload();
      out.trackSymptoms = Array.isArray(parsed.trackSymptoms) ? parsed.trackSymptoms.map(String) : [];
      out.addConcerns = Array.isArray(parsed.addConcerns) ? parsed.addConcerns.map(String) : [];
      out.suggestGoals = Array.isArray(parsed.suggestGoals) ? parsed.suggestGoals.map(String) : [];
      out.flagProviderTopics = Array.isArray(parsed.flagProviderTopics) ? parsed.flagProviderTopics.map(String) : [];
      out.riskWarnings = Array.isArray(parsed.riskWarnings) ? parsed.riskWarnings.map(String) : [];

      return out;
    } catch (err) {
      console.error("Follow-up suggestion error:", err);
      return null;
    }
  },
};
