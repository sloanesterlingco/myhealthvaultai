// src/features/labResults/services/labRiskEngine.ts

/**
 * LAB RISK ENGINE
 * ----------------
 * Converts ParsedLabValue (from labInterpreter) into:
 *  - Green / Yellow / Red risk levels
 *  - Human-readable labels and summaries
 *  - Panel-level risk summaries
 *
 * This is purely rules-based on top of:
 *  - normal ranges from labRules
 *  - flag classification from evaluateLabValue
 */

import { LabFlag } from "./labRules";
import { ParsedLabValue } from "./labInterpreter";

/**
 * UI risk level for tiles, badges, etc.
 *  - green  → in normal range
 *  - yellow → slightly / moderately abnormal
 *  - red    → significantly or critically abnormal
 *  - unknown → cannot classify (no range/value)
 */
export type LabRiskLevel = "green" | "yellow" | "red" | "unknown";

export interface LabRiskAssessment {
  /** Underlying classification from labRules (low/high/critical…) */
  flag: LabFlag;
  /** Simplified color-coded risk level for UI */
  level: LabRiskLevel;
  /** Short label, e.g. "Normal", "Slightly High", "Critically Low" */
  label: string;
  /** One-line summary for cards / compact views */
  summary: string;
  /** Optional longer explanation for detail views / AI prompts */
  detail?: string;

  /** Value + units for convenience */
  value: number | null;
  unit: string;

  /** Basic info */
  code: string;
  name: string;

  /** Whether this looks clinically urgent at a glance */
  isCritical: boolean;
  /** Whether this is any kind of out-of-range (including critical) */
  isAbnormal: boolean;
}

/**
 * Panel-level risk aggregation.
 */
export interface LabPanelRiskSummary {
  /** Highest risk level present in the panel */
  dominantLevel: LabRiskLevel;
  /** True if any critically abnormal values are present */
  anyCritical: boolean;
  /** Count of out-of-range tests (low/high/critical) */
  outOfRangeCount: number;
  /** All per-test assessments */
  items: LabRiskAssessment[];
}

/**
 * Internal helper:
 * Map LabFlag → base label + base risk level (before we look at magnitude).
 */
const baseRiskFromFlag = (flag: LabFlag): { level: LabRiskLevel; baseLabel: string } => {
  switch (flag) {
    case "normal":
      return { level: "green", baseLabel: "Normal" };
    case "low":
      return { level: "yellow", baseLabel: "Low" };
    case "high":
      return { level: "yellow", baseLabel: "High" };
    case "critical_low":
      return { level: "red", baseLabel: "Critically Low" };
    case "critical_high":
      return { level: "red", baseLabel: "Critically High" };
    case "unknown":
    default:
      return { level: "unknown", baseLabel: "Unknown" };
  }
};

/**
 * Adjust the yellow/red boundary based on how far from normal the value is.
 *
 * We treat mild deviations (e.g. 5–10% outside range) as yellow,
 * and bigger deviations as red.
 */
const adjustLevelByMagnitude = (
  level: LabRiskLevel,
  flag: LabFlag,
  parsed: ParsedLabValue
): LabRiskLevel => {
  if (!parsed.normalRange || parsed.value == null) {
    return level;
  }

  // If already critical_* we keep red.
  if (flag === "critical_low" || flag === "critical_high") {
    return "red";
  }

  // Normal stays green.
  if (flag === "normal") {
    return "green";
  }

  // For low/high (non-critical) we look at how far from normal range.
  const min = parsed.normalRange.min;
  const max = parsed.normalRange.max;
  const span = max - min || 1; // prevent div-by-zero
  const v = parsed.value;

  let deviation = 0;
  if (flag === "low") {
    deviation = (min - v) / span; // how far below lower limit
  } else if (flag === "high") {
    deviation = (v - max) / span; // how far above upper limit
  }

  // Mild deviations (< 10% of range width) → yellow
  // Larger deviations (>= 10–15%) → red
  if (deviation >= 0.15) {
    return "red";
  }

  return "yellow";
};

/**
 * Generate a short, human-readable summary based on flag.
 * This is intentionally generic; AI can build on top of it.
 */
const buildSummary = (parsed: ParsedLabValue, flag: LabFlag, level: LabRiskLevel): string => {
  const { name, value, unit } = parsed;

  if (value == null || level === "unknown") {
    return `${name}: value could not be interpreted.`;
  }

  const base = `${name} is ${value} ${unit}`;

  switch (flag) {
    case "normal":
      return `${base}, which is within the expected range.`;
    case "low":
      return `${base}, which is slightly below the expected range.`;
    case "high":
      return `${base}, which is slightly above the expected range.`;
    case "critical_low":
      return `${base}, which is critically low and may require urgent medical attention.`;
    case "critical_high":
      return `${base}, which is critically high and may require urgent medical attention.`;
    case "unknown":
    default:
      return `${base}. The risk level cannot be determined from available ranges.`;
  }
};

/**
 * Optionally provide a slightly longer description for detail screens.
 */
const buildDetail = (parsed: ParsedLabValue, flag: LabFlag): string | undefined => {
  const { name, normalRange, rule } = parsed;

  const rangeText = normalRange
    ? `Typical adult range: ${normalRange.min}–${normalRange.max} ${parsed.unit}. `
    : "";

  const ruleNote = rule.note ? `${rule.note} ` : "";

  switch (flag) {
    case "normal":
      return `${name} is within the expected range. ${rangeText}${ruleNote}`.trim();
    case "low":
      return `${name} is below the expected range. ${rangeText}${ruleNote}`.trim();
    case "high":
      return `${name} is above the expected range. ${rangeText}${ruleNote}`.trim();
    case "critical_low":
      return `${name} is critically low compared to expected ranges. ${rangeText}${ruleNote}This may represent a high-risk or unstable condition and should be discussed with a clinician promptly.`.trim();
    case "critical_high":
      return `${name} is critically high compared to expected ranges. ${rangeText}${ruleNote}This may represent a high-risk or unstable condition and should be discussed with a clinician promptly.`.trim();
    case "unknown":
    default:
      return undefined;
  }
};

/**
 * PUBLIC API:
 * Assess a single ParsedLabValue and return a LabRiskAssessment.
 */
export const assessLabValueRisk = (parsed: ParsedLabValue): LabRiskAssessment => {
  const base = baseRiskFromFlag(parsed.flag);

  // Start from base level, then adjust based on magnitude if needed.
  const adjustedLevel = adjustLevelByMagnitude(base.level, parsed.flag, parsed);

  const summary = buildSummary(parsed, parsed.flag, adjustedLevel);
  const detail = buildDetail(parsed, parsed.flag);

  const isCritical =
    parsed.flag === "critical_low" || parsed.flag === "critical_high";

  const isAbnormal =
    parsed.flag === "low" ||
    parsed.flag === "high" ||
    parsed.flag === "critical_low" ||
    parsed.flag === "critical_high";

  return {
    flag: parsed.flag,
    level: adjustedLevel,
    label: base.baseLabel,
    summary,
    detail,
    value: parsed.value,
    unit: parsed.unit,
    code: parsed.code,
    name: parsed.name,
    isCritical,
    isAbnormal,
  };
};

/**
 * PUBLIC API:
 * Aggregate risk across a full panel of lab values.
 */
export const summarizePanelRisk = (
  values: ParsedLabValue[]
): LabPanelRiskSummary => {
  const items = values.map((v) => assessLabValueRisk(v));

  let dominantLevel: LabRiskLevel = "green";
  let anyCritical = false;
  let outOfRangeCount = 0;

  for (const item of items) {
    if (item.isAbnormal) {
      outOfRangeCount += 1;
    }
    if (item.isCritical) {
      anyCritical = true;
    }

    // Determine dominant level by severity:
    // red > yellow > green > unknown
    if (item.level === "red") {
      dominantLevel = "red";
    } else if (item.level === "yellow" && dominantLevel !== "red") {
      dominantLevel = "yellow";
    } else if (item.level === "green" && dominantLevel === "unknown") {
      dominantLevel = "green";
    } else if (item.level === "unknown" && !items.length) {
      dominantLevel = "unknown";
    }
  }

  if (!items.length) {
    dominantLevel = "unknown";
  }

  return {
    dominantLevel,
    anyCritical,
    outOfRangeCount,
    items,
  };
};
