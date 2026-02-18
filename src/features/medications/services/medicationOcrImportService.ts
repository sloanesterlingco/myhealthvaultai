// src/features/medications/services/medicationOcrImportService.ts
//
// Medication label parser (V1) tuned for common US pharmacy labels.
// Fixes: patient name being selected as medication name.
// Improves: directions block capture, pharmacy normalization.
// Adds: pharmacy phone, NDC, quantity, refills, fill date, prescriber, patient name extraction.
// Firestore-safe: never writes undefined.

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export type MedicationOcrCandidate = {
  displayName: string;
  strength?: string;
  directions?: string;

  pharmacy?: string;
  pharmacyPhone?: string;

  rxNumber?: string;
  ndc?: string;

  quantity?: string;
  refills?: string;
  fillDate?: string;

  patientName?: string;
  prescriber?: string;

  rawOcrText: string;
  confidence: "high" | "medium" | "low";
};

function clean(text: string) {
  return String(text || "")
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
  const raw = String(s || "").trim();
  if (!raw) return raw;

  const lower = raw.toLowerCase();

  // Common OCR miss: "algreens" / "walareens" etc.
  if (lower.includes("walgreens") || lower.includes("algreens")) return "Walgreens";
  if (lower.includes("cvs")) return "CVS";
  if (lower.includes("rite aid") || lower.includes("riteaid")) return "Rite Aid";
  if (lower.includes("costco")) return "Costco";
  if (lower.includes("walmart")) return "Walmart";
  if (lower.includes("kroger")) return "Kroger";
  if (lower.includes("safeway")) return "Safeway";
  if (lower.includes("publix")) return "Publix";
  if (lower.includes("target")) return "Target";
  if (lower.includes("heb") || lower.includes("h-e-b")) return "H-E-B";

  // If line is something like "WALGREENS PHARMACY", strip "PHARMACY"
  return raw.replace(/\bpharmacy\b/i, "").replace(/\s{2,}/g, " ").trim();
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
 * NDC patterns:
 * NDC 0000-0000-00 or similar (4-4-2, 5-3-2, etc.)
 */
function extractNdc(all: string): string | undefined {
  const m =
    all.match(/\bNDC\s*[:#]?\s*([0-9]{4,5}[-\s]?[0-9]{3,4}[-\s]?[0-9]{1,2})\b/i) ||
    all.match(/\b([0-9]{4,5}-[0-9]{3,4}-[0-9]{1,2})\b/);
  if (!m?.[1]) return undefined;
  return String(m[1]).replace(/\s+/g, "-").trim();
}

/**
 * Phone patterns:
 * (555) 555-5555, 555-555-5555, 555.555.5555
 */
function extractPhone(all: string): string | undefined {
  const m =
    all.match(/(\(\d{3}\)\s*\d{3}[-.\s]?\d{4})/) ||
    all.match(/(\d{3}[-.\s]\d{3}[-.\s]\d{4})/);
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

  const alphaTokens = tokens.filter((t) => /^[A-Z]{1,20}\.?$/i.test(t));
  if (alphaTokens.length !== tokens.length) return false;

  return true;
}

function isBadLineForMedicationName(l: string): boolean {
  const lower = l.toLowerCase();

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
  const indexed = ls.map((raw, idx) => ({
    raw,
    idx,
    norm: raw.replace(/\s{2,}/g, " ").trim(),
  }));

  const candidates = indexed
    .filter(({ norm }) => norm.length >= 4 && norm.length <= 50)
    .filter(({ norm }) => /[a-z]/i.test(norm))
    .filter(({ norm }) => !isBadLineForMedicationName(norm))
    .filter(({ norm }) => !looksLikePersonName(norm));

  if (candidates.length === 0) return {};

  const score = (l: string, idx: number) => {
    let s = 0;

    if (/\b\d+(?:\.\d+)?\s*(mg|mcg|ug|g|ml|iu|units|unit|%)\b/i.test(l)) s += 10;
    if (/\b(micro|capsule|tablet|tab|cap|solution|cream|ointment)\b/i.test(l)) s += 2;
    if (/\b(ine|ol|one|ide|ate|ium|pam|pril|sartan|statin)\b/i.test(l)) s += 2;

    const digits = (l.match(/\d/g) || []).length;
    if (digits > 10) s -= 4;

    if (/\b(road|rd\.?|street|st\.?|drive|dr\.?|ave|avenue|blvd|lane|ln\.?)\b/i.test(l)) s -= 6;

    if (idx === 0) s -= 5;
    if (idx === 1) s -= 2;

    return s;
  };

  type Best = { norm: string; raw: string; s: number; idx: number };
  let best: Best | null = null;

  for (const c of candidates) {
    const s = score(c.norm, c.idx);
    if (best === null || s > best.s) best = { norm: c.norm, raw: c.raw, s, idx: c.idx };
  }

  if (best === null) return {};

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

    if (
      /\b(qty|quantity|refill|rx\b|prescriber|doctor|dr\b|mfg)\b/i.test(l) ||
      /\b\d{5,}-\d{3,}\b/.test(l)
    ) {
      break;
    }

    out.push(l);
  }

  return out.join(" ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Pharmacy extraction: look for known chain or "pharmacy" lines.
 */
function extractPharmacy(ls: string[]): string | undefined {
  const line = ls.find((l) =>
    /\b(walgreens|algreens|cvs|rite aid|riteaid|costco|walmart|kroger|safeway|publix|target|pharmacy)\b/i.test(
      l
    )
  );
  if (!line) return undefined;

  const stripped = line.replace(/^pharmacy\s*[:\-]?\s*/i, "").trim();
  return normalizePharmacyName(stripped);
}

function extractQuantity(ls: string[]): string | undefined {
  for (const l of ls) {
    const m = l.match(/\b(QTY|Qty|Quantity)\s*[:#]?\s*([0-9]+)\b/);
    if (m?.[2]) return m[2].trim();
  }
  return undefined;
}

function extractRefills(ls: string[]): string | undefined {
  for (const l of ls) {
    const m = l.match(/\b(Refills?|Rfl)\s*[:#]?\s*([0-9]+)\b/i);
    if (m?.[2]) return m[2].trim();
  }
  return undefined;
}

function extractFillDate(ls: string[]): string | undefined {
  for (const l of ls) {
    const m =
      l.match(/\b(Filled|Fill Date|Date)\s*[:#]?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\b/i) ||
      l.match(/\b([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\b/);
    if (m) return (m[2] || m[1])?.trim();
  }
  return undefined;
}

function extractPatientName(ls: string[]): string | undefined {
  // Prefer explicit label keys if present
  for (const l of ls) {
    const m = l.match(/\b(Patient|Pt)\s*[:#]?\s*(.+)$/i);
    if (m?.[2]) return m[2].trim();
  }

  // Otherwise: first ALLCAPS person-looking line in top 8 lines
  for (const l of ls.slice(0, 8)) {
    if (looksLikePersonName(l)) return l.trim();
  }

  return undefined;
}

function extractPrescriber(ls: string[]): string | undefined {
  for (const l of ls) {
    const m = l.match(/\b(Prescriber|Prescribed by)\s*[:#]?\s*(.+)$/i);
    if (m?.[2]) return m[2].trim();
  }

  // fallback: look for "DR" with a name
  for (const l of ls) {
    const m = l.match(/\b(Dr\.?|Doctor)\s+(.+)$/i);
    if (m?.[0]) return l.trim();
  }

  return undefined;
}

export function proposeMedicationFromOcr(rawText: string): MedicationOcrCandidate {
  const raw = clean(rawText);
  const ls = lines(raw);
  const all = ls.join(" ");

  const rxNumber = extractRxNumber(all);
  const strength = extractStrength(all);

  const { name } = extractMedicationName(ls);

  const directions = extractDirections(ls);
  const pharmacy = extractPharmacy(ls);

  // New fields
  const pharmacyPhone = extractPhone(all);
  const ndc = extractNdc(all);
  const quantity = extractQuantity(ls);
  const refills = extractRefills(ls);
  const fillDate = extractFillDate(ls);
  const patientName = extractPatientName(ls);
  const prescriber = extractPrescriber(ls);

  let confidence: MedicationOcrCandidate["confidence"] = "low";
  if (name && (strength || directions)) confidence = "medium";
  if (name && strength && directions) confidence = "high";

  return {
    displayName: name ?? "",
    strength,
    directions,

    pharmacy,
    pharmacyPhone,

    rxNumber,
    ndc,

    quantity,
    refills,
    fillDate,

    patientName,
    prescriber,

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

  // Never write undefined to Firestore — use null or "".
  await addDoc(medsRef, {
    name: candidate.displayName,
    strength: candidate.strength ?? null,
    directions: candidate.directions ?? null,

    pharmacy: candidate.pharmacy ?? null,
    pharmacyPhone: candidate.pharmacyPhone ?? null,

    rxNumber: candidate.rxNumber ?? null,
    ndc: candidate.ndc ?? null,

    quantity: candidate.quantity ?? null,
    refills: candidate.refills ?? null,
    fillDate: candidate.fillDate ?? null,

    patientName: candidate.patientName ?? null,
    prescriber: candidate.prescriber ?? null,

    rawOcrText: candidate.rawOcrText || "",
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

      pharmacy: candidate.pharmacy ?? null,
      pharmacyPhone: candidate.pharmacyPhone ?? null,
      rxNumber: candidate.rxNumber ?? null,
      ndc: candidate.ndc ?? null,

      quantity: candidate.quantity ?? null,
      refills: candidate.refills ?? null,
      fillDate: candidate.fillDate ?? null,

      prescriber: candidate.prescriber ?? null,
      patientName: candidate.patientName ?? null,
    },
  });
}
