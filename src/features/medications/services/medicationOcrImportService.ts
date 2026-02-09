// src/features/medications/services/medicationOcrImportService.ts
//
// Medication label parser (V1) tuned for common US pharmacy labels.
// Fixes: patient name being selected as medication name.
// Improves: directions block capture, pharmacy normalization.

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export type MedicationOcrCandidate = {
  displayName: string;
  strength?: string;
  directions?: string;
  pharmacy?: string;
  rxNumber?: string;
  rawOcrText: string;
  confidence: "high" | "medium" | "low";
};

function clean(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function lines(text: string) {
  return clean(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function normalizePharmacyName(s: string): string {
  const lower = s.toLowerCase();

  // Common OCR miss: "algreens" / "walareens" etc.
  if (lower.includes("walgreens") || lower.includes("algreens")) return "Walgreens";
  if (lower.includes("cvs")) return "CVS";
  if (lower.includes("rite aid") || lower.includes("riteaid")) return "Rite Aid";
  if (lower.includes("costco")) return "Costco";
  if (lower.includes("walmart")) return "Walmart";
  if (lower.includes("kroger")) return "Kroger";

  return s.trim();
}

/**
 * Rx number patterns:
 * RX 123456-7890, Rx# 12345, etc.
 */
function extractRxNumber(all: string): string | undefined {
  const m =
    all.match(/\b(?:rx|rx#|prescription|script)\s*[:#]?\s*([a-z0-9\-]{5,})\b/i) ||
    all.match(/\b([0-9]{5,}-[0-9]{3,})\b/); // like 2388021-09681
  return m?.[1]?.toString()?.trim();
}

/**
 * Strength patterns:
 * 10 mg, 100mg, 0.1%, 5 mcg, 1 g, 200 IU, etc.
 */
function extractStrength(all: string): string | undefined {
  const m =
    all.match(/\b(\d+(?:\.\d+)?)\s*(mg|mcg|ug|g|ml|iu|units|unit|%)\b/i) ||
    all.match(/\b(mg|mcg|ug|g|ml|iu|units|unit|%)\s*(\d+(?:\.\d+)?)\b/i);

  if (!m) return undefined;

  if (m.length >= 3 && /^[a-z%]+$/i.test(m[2])) {
    return `${m[1]} ${m[2].toLowerCase()}`;
  }
  if (m.length >= 3 && /^[a-z%]+$/i.test(m[1])) {
    return `${m[2]} ${m[1].toLowerCase()}`;
  }

  return undefined;
}

function looksLikePersonName(line: string): boolean {
  // Example: "JOHN A WHITEHEAD"
  // 2–4 tokens, mostly alphabetic, no digits, no medication units, not too long
  const l = line.trim();
  if (!l) return false;

  if (/\d/.test(l)) return false; // names rarely have digits
  if (/\b(mg|mcg|ug|g|ml|iu|units|unit|%)\b/i.test(l)) return false;

  const tokens = l.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;

  // If every token is short-ish alpha (initials allowed)
  const alphaTokens = tokens.filter((t) => /^[A-Z]{1,20}\.?$/i.test(t));
  if (alphaTokens.length !== tokens.length) return false;

  // Many labels show patient name in ALL CAPS
  return true;
}

function isBadLineForMedicationName(l: string): boolean {
  const lower = l.toLowerCase();

  // obvious non-drug lines
  if (
    lower.includes("address") ||
    lower.includes("drive") ||
    lower.includes("street") ||
    lower.includes("st ") ||
    lower.includes("ut ") ||
    lower.includes("qty") ||
    lower.includes("quantity") ||
    lower.includes("refill") ||
    lower.includes("pharmacy") ||
    lower.includes("prescriber") ||
    lower.includes("doctor") ||
    lower.includes("dr ") ||
    lower.includes("bedtime") ||
    lower.includes("nightly") ||
    lower.includes("every") ||
    lower.includes("insert") ||
    lower.includes("take") ||
    lower.includes("apply") ||
    lower.includes("use")
  ) {
    return true;
  }

  // phone-like
  if (/\b\d{3}[-)\s]?\d{3}[-\s]?\d{4}\b/.test(l)) return true;

  return false;
}

/**
 * Medication name extraction:
 * - prefer a line containing strength units (like "PROGESTERONE MICRO 100MG")
 * - never use patient-name-like line
 * - avoid address/directions lines
 */
function extractMedicationName(
  ls: string[]
): { name?: string; sourceLine?: string } {
  // Build candidates with original index preserved (no indexOf problems)
  const indexed = ls.map((raw, idx) => ({
    raw,
    idx,
    norm: raw.replace(/\s{2,}/g, " ").trim(),
  }));

  const candidates = indexed
    .filter(({ norm }) => norm.length >= 4 && norm.length <= 50)
    .filter(({ norm }) => /[a-z]/i.test(norm))
    .filter(({ norm }) => !isBadLineForMedicationName(norm))
    .filter(({ norm }) => !looksLikePersonName(norm)); // ✅ key fix

  if (candidates.length === 0) return {};

  // Score candidates
  const score = (l: string, idx: number) => {
    let s = 0;

    // Strong signal: contains dosage unit (this is usually the drug line)
    if (/\b\d+(?:\.\d+)?\s*(mg|mcg|ug|g|ml|iu|units|unit|%)\b/i.test(l)) s += 10;

    // Bonus: common med keywords
    if (/\b(micro|capsule|tablet|tab|cap|solution|cream|ointment)\b/i.test(l)) s += 2;

    // Bonus: drug-like suffixes
    if (/\b(ine|ol|one|ide|ate|ium|pam|pril|sartan|statin)\b/i.test(l)) s += 2;

    // Penalize lines with too many digits
    const digits = (l.match(/\d/g) || []).length;
    if (digits > 10) s -= 4;

    // Penalize lines that look like addresses (extra safety)
    if (/\b(road|rd\.?|street|st\.?|drive|dr\.?|ave|avenue|blvd|lane|ln\.?)\b/i.test(l)) s -= 6;

    // Slightly penalize the very first lines (often patient/address)
    if (idx === 0) s -= 5;
    if (idx === 1) s -= 2;

    return s;
  };

  type Best = { norm: string; raw: string; s: number; idx: number };

  let best: Best | null = null;

  for (const c of candidates) {
    const s = score(c.norm, c.idx);
    if (best === null || s > best.s) {
      best = { norm: c.norm, raw: c.raw, s, idx: c.idx };
    }
  }

  if (best === null) return {};

  // Strip strength from display name if it exists on the same line
  let display = best.norm.replace(
    /\b\d+(?:\.\d+)?\s*(mg|mcg|ug|g|ml|iu|units|unit|%)\b/gi,
    ""
  );

  display = display.replace(/\s{2,}/g, " ").trim();

  return { name: display, sourceLine: best.raw };
}


/**
 * Directions extraction:
 * Capture a multi-line instruction block starting at TAKE/INSERT/APPLY/USE.
 */
function extractDirections(ls: string[]): string | undefined {
  const startIdx = ls.findIndex((l) =>
    /\b(take|insert|apply|inhale|instill|use)\b/i.test(l)
  );

  if (startIdx < 0) return undefined;

  const out: string[] = [];

  for (let i = startIdx; i < Math.min(ls.length, startIdx + 6); i++) {
    const l = ls[i];

    // stop if we hit obvious non-directions info
    if (
      /\b(qty|quantity|refill|rx\b|prescriber|doctor|dr\b|mfg)\b/i.test(l) ||
      /\b\d{5,}-\d{3,}\b/.test(l)
    ) {
      break;
    }

    out.push(l);
  }

  // Normalize spacing
  return out.join(" ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Pharmacy extraction: look for known chain or "pharmacy" lines.
 */
function extractPharmacy(ls: string[]): string | undefined {
  const line = ls.find((l) =>
    /\b(walgreens|algreens|cvs|rite aid|riteaid|costco|walmart|kroger|pharmacy)\b/i.test(
      l
    )
  );
  if (!line) return undefined;

  const stripped = line.replace(/^pharmacy\s*[:\-]?\s*/i, "").trim();
  return normalizePharmacyName(stripped);
}

export function proposeMedicationFromOcr(rawText: string): MedicationOcrCandidate {
  const raw = clean(rawText);
  const ls = lines(raw);
  const all = ls.join(" ");

  const rxNumber = extractRxNumber(all);
  const strength = extractStrength(all);

  const { name, sourceLine } = extractMedicationName(ls);

  const directions = extractDirections(ls);
  const pharmacy = extractPharmacy(ls);

  let confidence: MedicationOcrCandidate["confidence"] = "low";
  if (name && (strength || directions)) confidence = "medium";
  if (name && strength && directions) confidence = "high";

  return {
    displayName: name ?? "",
    strength,
    directions,
    pharmacy,
    rxNumber,
    rawOcrText: raw,
    confidence,
  };
}

export async function saveMedicationFromOcr(opts: {
  patientId: string;
  candidate: MedicationOcrCandidate;
}) {
  const { patientId, candidate } = opts;

  const medsRef = collection(db, "patients", patientId, "medications");
  await addDoc(medsRef, {
    name: candidate.displayName,
    strength: candidate.strength ?? null,
    directions: candidate.directions ?? null,
    pharmacy: candidate.pharmacy ?? null,
    rxNumber: candidate.rxNumber ?? null,
    rawOcrText: candidate.rawOcrText,
    confidence: candidate.confidence,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const timelineRef = collection(db, "patients", patientId, "timelineEvents");
  await addDoc(timelineRef, {
    type: "medication_added",
    title: `Medication added: ${candidate.displayName}`,
    createdAt: serverTimestamp(),
    metadata: {
      name: candidate.displayName,
      strength: candidate.strength ?? null,
      directions: candidate.directions ?? null,
    },
  });
}
