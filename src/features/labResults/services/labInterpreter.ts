// src/features/labResults/services/labInterpreter.ts

/**
 * LAB INTERPRETER
 * ----------------
 * Takes messy OCR / EMR lab rows and converts them into
 * clean, structured lab objects using the Lab Rules engine.
 *
 * It does NOT talk to OpenAI directly — this is deterministic
 * and safe. Later we can add an AI-assisted layer on top.
 */

import {
  LabRule,
  LabFlag,
  LabNumericRange,
  LabCriticalThresholds,
  SexAtBirth,
  findLabRule,
  evaluateLabValue,
} from "./labRules";

/**
 * Raw OCR row coming from your vision / OCR layer.
 *
 * Example:
 *  {
 *    rawName: "HGB",
 *    valueText: "11.2 g/dL",
 *    unitText: "g/dL",
 *    referenceRangeText: "12.0-15.5",
 *    flagText: "L"
 *  }
 */
export interface OcrLabRow {
  rawName: string;
  valueText: string;
  unitText?: string | null;
  referenceRangeText?: string | null;
  flagText?: string | null; // e.g. "H", "L", "*"
}

/**
 * Canonical parsed lab value, ready to save to Firestore.
 */
export interface ParsedLabValue {
  /** Canonical code from LabRule (e.g. "HGB") */
  code: string;
  /** Human-friendly name (e.g. "Hemoglobin") */
  name: string;
  /** Panel / category (CBC, CMP, etc.) */
  category: LabRule["category"];

  /** Numeric value if parsable, otherwise null */
  value: number | null;

  /** Display units (from rule, OCR or both) */
  unit: string;

  /** Evaluation vs normal range (low/normal/high/critical) */
  flag: LabFlag;

  /** True if flag indicates anything outside "normal" */
  isOutOfRange: boolean;

  /** Normal range actually used for evaluation (sex-aware) */
  normalRange?: LabNumericRange;

  /** Critical thresholds from rule, if present */
  critical?: LabCriticalThresholds;

  /** Sex used to pick normal range, if provided */
  sexUsed?: SexAtBirth;

  /** Raw lab rule object (for advanced consumers) */
  rule: LabRule;

  /** Original OCR row for traceability */
  raw: OcrLabRow;
}

/**
 * If we want to interpret a full panel at once.
 */
export interface ParsedLabPanel {
  items: ParsedLabValue[];
  /** Rows we couldn't interpret at all */
  unknownRows: OcrLabRow[];
}

/**
 * Utility: strip everything except digits, dot, comma, minus,
 * then extract the *first* numeric token.
 */
const parseNumericValue = (text: string | undefined | null): number | null => {
  if (!text) return null;

  // Replace comma decimal with dot if present (e.g. "5,6" -> "5.6")
  const cleaned = text.replace(",", ".").replace(/[^\d\.\-]+/g, " ");
  const match = cleaned.match(/-?\d+(\.\d+)?/);

  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Normalize unit text: trim, strip parentheses, etc.
 * Falls back to rule's unit if OCR unit is missing.
 */
const normalizeUnit = (ocrUnit: string | undefined | null, rule: LabRule): string => {
  if (!ocrUnit) return rule.unit;

  const trimmed = ocrUnit.trim();
  if (!trimmed) return rule.unit;

  // Very basic cleanup: remove surrounding brackets like "[mg/dL]"
  const bracketStripped = trimmed.replace(/^\[|\]$/g, "");

  return bracketStripped || rule.unit;
};

/**
 * Optionally parse a reference range string (e.g. "12.0-15.5").
 * We don't use this for evaluation yet (we rely on our rules),
 * but keeping it here for future calibration/logging.
 */
export const parseReferenceRange = (
  refText: string | undefined | null
): LabNumericRange | undefined => {
  if (!refText) return undefined;

  const text = refText.replace(",", ".").replace(/[^\d\.\-]+/g, " ");
  const matches = text.match(/-?\d+(\.\d+)?/g);

  if (!matches || matches.length < 2) return undefined;

  const min = Number(matches[0]);
  const max = Number(matches[1]);

  if (Number.isNaN(min) || Number.isNaN(max)) return undefined;

  return { min, max };
};

/**
 * Try to resolve a LabRule from an OCR name.
 * We try:
 *  - direct findLabRule(name)
 *  - stripping extra symbols, parentheses, etc.
 */
const resolveLabRuleFromName = (rawName: string): LabRule | undefined => {
  if (!rawName) return undefined;

  // Direct attempt (handles HGB, Hemoglobin, etc.)
  let rule = findLabRule(rawName);
  if (rule) return rule;

  const stripped = rawName
    .replace(/\(.*?\)/g, "") // remove parentheses
    .replace(/[^A-Za-z0-9]/g, " ") // non-alphanumerics -> space
    .trim();

  if (!stripped) return undefined;

  rule = findLabRule(stripped);
  if (rule) return rule;

  // Try uppercased
  rule = findLabRule(stripped.toUpperCase());
  if (rule) return rule;

  // Try first token only (e.g. "HGB g/dL" -> "HGB")
  const firstToken = stripped.split(" ")[0];
  if (firstToken) {
    rule = findLabRule(firstToken);
  }

  return rule;
};

/**
 * Interpret a *single* OCR row into a structured ParsedLabValue.
 *
 * Returns null if we can't:
 *  - map the name to a lab rule, OR
 *  - parse a numeric value
 */
export const interpretOcrLabRow = (
  row: OcrLabRow,
  sex?: SexAtBirth
): ParsedLabValue | null => {
  const rule = resolveLabRuleFromName(row.rawName);
  if (!rule) {
    return null;
  }

  const value = parseNumericValue(row.valueText);
  if (value === null) {
    return null;
  }

  const unit = normalizeUnit(row.unitText, rule);

  const evaluation = evaluateLabValue(rule, value, sex);
  const isOutOfRange =
    evaluation.flag === "low" ||
    evaluation.flag === "high" ||
    evaluation.flag === "critical_low" ||
    evaluation.flag === "critical_high";

  const parsed: ParsedLabValue = {
    code: rule.code,
    name: rule.name,
    category: rule.category,
    value,
    unit,
    flag: evaluation.flag,
    isOutOfRange,
    normalRange: evaluation.usedRange,
    critical: rule.critical,
    sexUsed: sex,
    rule,
    raw: row,
  };

  return parsed;
};

/**
 * Interpret a whole panel (array of rows) at once.
 */
export const interpretLabPanel = (
  rows: OcrLabRow[],
  sex?: SexAtBirth
): ParsedLabPanel => {
  const items: ParsedLabValue[] = [];
  const unknownRows: OcrLabRow[] = [];

  for (const row of rows) {
    const parsed = interpretOcrLabRow(row, sex);
    if (parsed) {
      items.push(parsed);
    } else {
      unknownRows.push(row);
    }
  }

  return { items, unknownRows };
};

/**
 * Convenience: interpret a single line of text (e.g. from EMR paste)
 * like "HGB 11.2 g/dL (12.0-15.5) L".
 *
 * This is optional but handy for future "paste labs" feature.
 */
export const interpretLabLine = (
  line: string,
  sex?: SexAtBirth
): ParsedLabValue | null => {
  if (!line || !line.trim()) return null;

  // Split into tokens and assume:
  //  [name-ish parts] [numeric-ish token] [unit-ish token?] [ref range / flag...]
  const tokens = line.trim().split(/\s+/);

  if (tokens.length < 2) return null;

  // Find first numeric token index
  let numericIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    const n = parseNumericValue(tokens[i]);
    if (n !== null) {
      numericIndex = i;
      break;
    }
  }

  if (numericIndex <= 0) return null;

  const namePart = tokens.slice(0, numericIndex).join(" ");
  const valuePart = tokens[numericIndex];
  const unitPart = tokens[numericIndex + 1] || undefined;
  const rest = tokens.slice(numericIndex + 1).join(" ");

  const row: OcrLabRow = {
    rawName: namePart,
    valueText: valuePart,
    unitText: unitPart,
    referenceRangeText: rest || undefined,
  };

  return interpretOcrLabRow(row, sex);
};
