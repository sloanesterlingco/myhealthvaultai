// functions/src/ocr/structuredExtractor.ts

/**
 * Backend-only structured extraction
 * Uses OpenAI to convert OCR text → structured JSON
 * NO interpretation, NO diagnostics
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractionInput {
  rawText: string;
  sourceType: string;      // image | pdf | camera | screenshot | unknown
  documentType: string;    // lab_report | medication_label | imaging_report | other
}

export async function extractStructuredData(input: ExtractionInput) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Extract structured medical record data only. " +
          "Do not interpret. Do not summarize. Output JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  const content = completion.choices[0].message?.content;

  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  return JSON.parse(content);
}
