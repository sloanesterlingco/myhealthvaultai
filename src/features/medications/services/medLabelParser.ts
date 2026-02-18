// src/features/medications/services/medLabelParser.ts
// V1: heuristic parser for US pharmacy labels.
// Works well for Walgreens/CVS/RiteAid-style prints but is general enough to help most labels.

export type ParsedMedLabel = {
  pharmacyName?: string;
  pharmacyPhone?: string;
  rxNumber?: string;
  ndc?: string;

  patientName?: string;
  prescriber?: string;

  fillDate?: string;
  quantity?: string;
  refills?: string;

  notes?: string;
};

function cleanLine(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function linesOf(text: string): string[] {
  return String(text || "")
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
}

function findPhone(text: string): string | undefined {
  // (555) 555-5555, 555-555-5555, 555.555.5555
  const m =
    text.match(/(\(\d{3}\)\s*\d{3}[-.\s]?\d{4})/) ||
    text.match(/(\d{3}[-.\s]\d{3}[-.\s]\d{4})/);
  return m?.[1];
}

function findRxNumber(text: string): string | undefined {
  // Rx: 1234567, RX#1234567, Rx# 1234567, Prescription: 1234567
  const m =
    text.match(/\bR[Xx]\s*[:#]?\s*([A-Za-z0-9-]{5,})\b/) ||
    text.match(/\bRX#\s*([A-Za-z0-9-]{5,})\b/i) ||
    text.match(/\bPrescription\s*[:#]?\s*([A-Za-z0-9-]{5,})\b/i);
  return m?.[1];
}

function findNdc(text: string): string | undefined {
  // NDC 0000-0000-00 (often with variations)
  const m = text.match(/\bNDC\s*[:#]?\s*([0-9]{4,5}[-\s]?[0-9]{3,4}[-\s]?[0-9]{1,2})\b/i);
  return m?.[1]?.replace(/\s+/g, "-");
}

function findQuantity(lines: string[]): string | undefined {
  // Qty: 30, Quantity 60, QTY 90
  for (const l of lines) {
    const m = l.match(/\b(QTY|Qty|Quantity)\s*[:#]?\s*([0-9]+)\b/);
    if (m) return m[2];
  }
  return undefined;
}

function findRefills(lines: string[]): string | undefined {
  // Refills: 2, Refill 0, Rfl: 1
  for (const l of lines) {
    const m = l.match(/\b(Refills?|Rfl)\s*[:#]?\s*([0-9]+)\b/i);
    if (m) return m[2];
  }
  return undefined;
}

function findFillDate(lines: string[]): string | undefined {
  // Filled: 01/23/2026, Fill Date 1/23/26
  for (const l of lines) {
    const m =
      l.match(/\b(Filled|Fill Date|Date)\s*[:#]?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\b/i) ||
      l.match(/\b([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\b/);
    if (m) return m[2] || m[1];
  }
  return undefined;
}

function guessPharmacyName(lines: string[]): string | undefined {
  // Usually first 1–3 lines. Prefer ones containing PHARMACY.
  const top = lines.slice(0, 5).join(" ");
  const m = top.match(/\b([A-Z][A-Z\s&'.-]{2,})\b\s+PHARMACY\b/);
  if (m) return cleanLine(m[0]);

  // fallback: first line if it looks like a name
  const first = lines[0] || "";
  if (first.length >= 4 && first.length <= 40) return first;
  return undefined;
}

function findPatient(lines: string[]): string | undefined {
  // Patient: John Doe
  for (const l of lines) {
    const m = l.match(/\b(Patient|Pt)\s*[:#]?\s*(.+)$/i);
    if (m && m[2]) return cleanLine(m[2]);
  }
  return undefined;
}

function findPrescriber(lines: string[]): string | undefined {
  // Prescriber: Dr ...
  for (const l of lines) {
    const m = l.match(/\b(Prescriber|Prescribed by|Doctor|Dr)\s*[:#]?\s*(.+)$/i);
    if (m && m[2]) return cleanLine(m[2]);
  }
  return undefined;
}

export function parseMedicationLabel(ocrText: string): ParsedMedLabel {
  const text = String(ocrText || "");
  const lines = linesOf(text);

  const pharmacyPhone = findPhone(text);
  const rxNumber = findRxNumber(text);
  const ndc = findNdc(text);

  return {
    pharmacyName: guessPharmacyName(lines),
    pharmacyPhone,
    rxNumber,
    ndc,
    patientName: findPatient(lines),
    prescriber: findPrescriber(lines),
    fillDate: findFillDate(lines),
    quantity: findQuantity(lines),
    refills: findRefills(lines),
  };
}
