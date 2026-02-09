// src/features/patient/services/labOcrService.ts

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { aiService } from "../../aiAssistant/services/aiService";

export type LabFlag = "low" | "normal" | "high" | "unknown";

export interface ParsedLabValue {
  name: string;               // e.g. "Hemoglobin"
  value: number | null;       // numeric value if available
  unit?: string;              // e.g. "g/dL"
  referenceRange?: string;    // e.g. "12.0–16.0"
  lowRef?: number | null;
  highRef?: number | null;
  flag?: LabFlag;             // low / normal / high / unknown
}

export interface ParsedLabPanel {
  panelName: string;          // e.g. "CBC", "Basic Metabolic Panel"
  collectedAt?: string | null; // ISO string if known
  values: ParsedLabValue[];
}

export interface LabOcrResult {
  panels: ParsedLabPanel[];
  rawText: string;
}

/**
 * labOcrService
 * -------------
 * 1) Takes raw lab text (or OCR output)
 * 2) Uses OpenAI to normalize → structured panels / values
 * 3) Saves to Firestore
 */
export const labOcrService = {
  /**
   * Step 1: Normalize lab text into structured JSON using OpenAI.
   * rawText = text from OCR or pasted report.
   */
  async parseLabTextWithAI(rawText: string): Promise<LabOcrResult> {
    const systemPrompt = `
You are a medical lab report parser for a personal health record app.
You receive the FULL TEXT of a lab report (including units and reference ranges).
Your job is to extract the information into STRICT JSON.

Respond ONLY with valid JSON in this TypeScript shape:

{
  "panels": [
    {
      "panelName": "string",
      "collectedAt": "ISO-8601 datetime string or null",
      "values": [
        {
          "name": "string",
          "value": number | null,
          "unit": "string or null",
          "referenceRange": "string or null",
          "lowRef": number | null,
          "highRef": number | null,
          "flag": "low" | "normal" | "high" | "unknown"
        }
      ]
    }
  ]
}

Rules:
- If you can't find a number, set value to null.
- If you can't determine lowRef/highRef, set them to null.
- Flag is:
  - "high" if clearly above normal for the provided range
  - "low" if clearly below
  - "normal" if within the range
  - "unknown" if no range is given.
`;

    const reply = await aiService.sendMessage({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the raw lab report text:\n\n${rawText}`,
        },
      ],
    });

    // Try to parse the model's response as JSON
    try {
      const cleaned = reply.trim();
      const jsonStart = cleaned.indexOf("{");
      const jsonText =
        jsonStart >= 0 ? cleaned.slice(jsonStart) : cleaned;

      const parsed = JSON.parse(jsonText) as { panels?: ParsedLabPanel[] };

      return {
        panels: parsed.panels ?? [],
        rawText,
      };
    } catch (error) {
      console.log("Lab OCR JSON parse error:", error, reply);
      throw new Error(
        "Could not parse AI response. Please try again or edit the text."
      );
    }
  },

  /**
   * Step 2: Save parsed panels to Firestore.
   * Each value stored inside a 'labs' collection.
   */
  async saveOcrLabs(result: LabOcrResult): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");

    const labsCollection = collection(db, "labs");

    const baseMeta = {
      userId: user.uid,
      source: "ocr",
      rawText: result.rawText,
      createdAt: serverTimestamp(),
    };

    for (const panel of result.panels) {
      await addDoc(labsCollection, {
        ...baseMeta,
        panelName: panel.panelName,
        collectedAt: panel.collectedAt ?? null,
        values: panel.values,
      });
    }
  },
};
