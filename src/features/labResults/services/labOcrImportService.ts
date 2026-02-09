// src/features/labResults/services/labOcrImportService.ts
// Lab OCR import (v1-safe)
// - Extracts ONLY: A1c, LDL, HDL, Total Chol, Creatinine, eGFR
// - User MUST confirm before saving
// - Saves into existing app collections:
//   patients/{uid}/labResults
//   patients/{uid}/timelineEvents

import { addDoc, collection } from "firebase/firestore";
import { db } from "../../../lib/firebase";

const COLLECTIONS = {
  labResults: "labResults",
  timelineEvents: "timelineEvents",
};

export type LabAnalyte =
  | "A1C"
  | "LDL"
  | "HDL"
  | "TOTAL_CHOL"
  | "CREATININE"
  | "EGFR";

export type LabOcrCandidate = {
  analyte: LabAnalyte;
  displayName: string;
  value: number;
  unit?: string;
  collectedAt?: string; // YYYY-MM-DD
  rawLine: string;
  confidence: "high" | "medium" | "low";
};

export type SaveLabParams = {
  patientId: string;
  candidate: LabOcrCandidate;
  sourceDocId?: string;
};

function normalizeText(input: string): string {
  return (input || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

function toNumberSafe(s: string): number | null {
  const cleaned = s.replace(/[,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function findDateISO(text: string): string | undefined {
  const m1 = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;

  const m2 = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m2) {
    const mm = String(m2[1]).padStart(2, "0");
    const dd = String(m2[2]).padStart(2, "0");
    let yyyy = m2[3];
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }

  return undefined;
}

type ExtractSpec = {
  analyte: LabAnalyte;
  displayName: string;
  regexes: RegExp[];
};

const SPECS: ExtractSpec[] = [
  {
    analyte: "A1C",
    displayName: "Hemoglobin A1c",
    regexes: [
      /\b(A1c|HbA1c|HgbA1c|Hemoglobin A1c)\b[^0-9]{0,20}(\d+(\.\d+)?)\s*(%|percent)?/i,
      /\bGlycohemoglobin\b[^0-9]{0,20}(\d+(\.\d+)?)\s*(%|percent)?/i,
    ],
  },
  {
    analyte: "LDL",
    displayName: "LDL",
    regexes: [
      /\bLDL\b[^0-9]{0,25}(\d+(\.\d+)?)\s*(mg\/dL|mmol\/L)?/i,
      /\bLDL[- ]?C\b[^0-9]{0,25}(\d+(\.\d+)?)\s*(mg\/dL|mmol\/L)?/i,
    ],
  },
  {
    analyte: "HDL",
    displayName: "HDL",
    regexes: [
      /\bHDL\b[^0-9]{0,25}(\d+(\.\d+)?)\s*(mg\/dL|mmol\/L)?/i,
      /\bHDL[- ]?C\b[^0-9]{0,25}(\d+(\.\d+)?)\s*(mg\/dL|mmol\/L)?/i,
    ],
  },
  {
    analyte: "TOTAL_CHOL",
    displayName: "Total cholesterol",
    regexes: [
      /\b(Total\s+Cholesterol|Cholesterol,\s*Total|Cholesterol\s+Total)\b[^0-9]{0,25}(\d+(\.\d+)?)\s*(mg\/dL|mmol\/L)?/i,
    ],
  },
  {
    analyte: "CREATININE",
    displayName: "Creatinine",
    regexes: [
      /\bCreatinine\b[^0-9]{0,25}(\d+(\.\d+)?)\s*(mg\/dL|umol\/L|µmol\/L)?/i,
      /\bCr\b[^0-9]{0,10}(\d+(\.\d+)?)\s*(mg\/dL|umol\/L|µmol\/L)?/i,
    ],
  },
  {
    analyte: "EGFR",
    displayName: "eGFR",
    regexes: [
      /\b(eGFR|Estimated\s+GFR|GFR)\b[^0-9]{0,25}(\d+(\.\d+)?)\s*(mL\/min\/1\.73m2|mL\/min\/1\.73\s*m2)?/i,
    ],
  },
];

export function proposeLabsFromOcr(ocrText: string): {
  normalizedText: string;
  detectedDate?: string;
  candidates: LabOcrCandidate[];
} {
  const text = normalizeText(ocrText);
  const detectedDate = findDateISO(text);

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const found: LabOcrCandidate[] = [];

  for (const spec of SPECS) {
    for (const line of lines) {
      for (const rx of spec.regexes) {
        const m = line.match(rx);
        if (!m) continue;

        // numeric token is usually in group 2 or 1 depending on regex
        const numericToken =
          m.find((g) => typeof g === "string" && /^\d+(\.\d+)?$/.test(g.trim())) || null;

        if (!numericToken) continue;
        const value = toNumberSafe(numericToken);
        if (value == null) continue;

        const unitMatch = line.match(
          /\b(mg\/dL|mmol\/L|%|percent|umol\/L|µmol\/L|mL\/min\/1\.73m2|mL\/min\/1\.73\s*m2)\b/i
        );
        const unit = unitMatch ? unitMatch[1].replace("percent", "%") : undefined;

        found.push({
          analyte: spec.analyte,
          displayName: spec.displayName,
          value,
          unit,
          collectedAt: detectedDate,
          rawLine: line,
          confidence: unit ? "high" : "medium",
        });
      }
    }
  }

  // Dedup by analyte
  const rank = (c: LabOcrCandidate["confidence"]) => (c === "high" ? 3 : c === "medium" ? 2 : 1);
  const best = new Map<LabAnalyte, LabOcrCandidate>();
  for (const c of found) {
    const existing = best.get(c.analyte);
    if (!existing || rank(c.confidence) > rank(existing.confidence)) best.set(c.analyte, c);
  }

  return { normalizedText: text, detectedDate, candidates: Array.from(best.values()) };
}

export async function saveLabFromOcr(params: SaveLabParams): Promise<{
  labId: string;
  timelineId: string;
}> {
  const { patientId, candidate, sourceDocId } = params;

  if (!patientId) throw new Error("patientId is required");
  if (!candidate?.displayName) throw new Error("candidate.displayName is required");
  if (candidate.value == null || !Number.isFinite(candidate.value)) {
    throw new Error("candidate.value is required");
  }

  // Save into existing labResults collection with your LabResult schema-ish fields
  const labsRef = collection(db, "patients", patientId, COLLECTIONS.labResults);

  const labDoc = await addDoc(labsRef, {
    name: candidate.displayName,
    value: String(candidate.value),
    units: candidate.unit || null,
    date: candidate.collectedAt || null,
    source: "patient_uploaded",
    notes: `OCR (${candidate.confidence}): ${candidate.rawLine}`,
    meta: {
      analyte: candidate.analyte,
      sourceDocId: sourceDocId || null,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Timeline event
  const timelineRef = collection(db, "patients", patientId, COLLECTIONS.timelineEvents);

  const timelineDoc = await addDoc(timelineRef, {
    type: "GENERAL",
    summary: `Lab added: ${candidate.displayName} ${candidate.value}${candidate.unit ? " " + candidate.unit : ""}`,
    detail: candidate.rawLine,
    date: candidate.collectedAt || new Date().toISOString().slice(0, 10),
    timestamp: Date.now(),
    level: "low",
    meta: {
      source: "labResults",
      labId: labDoc.id,
      analyte: candidate.analyte,
      sourceDocId: sourceDocId || null,
    },
    createdAt: Date.now().toString(),
  });

  return { labId: labDoc.id, timelineId: timelineDoc.id };
}
