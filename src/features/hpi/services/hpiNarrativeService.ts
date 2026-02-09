// src/features/hpi/services/hpiNarrativeService.ts

import { aiService } from "../../aiAssistant/services/aiService";
import { HPI_NARRATIVE_PROMPT } from "../prompts/hpiNarrativePrompt";
import type { HPIData } from "../hooks/useHPI";

export async function generateHPINarrative(hpi: HPIData): Promise<string> {
  const reply = await aiService.sendMessage({
    model: "gpt-4.1",
    temperature: 0.2,
    messages: [
      { role: "system", content: HPI_NARRATIVE_PROMPT },
      {
        role: "user",
        content: JSON.stringify(hpi),
      },
    ],
  });

  return String(reply).trim();
}
