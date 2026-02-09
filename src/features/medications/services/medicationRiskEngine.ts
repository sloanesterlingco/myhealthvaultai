// src/features/medications/services/medicationRiskEngine.ts

import {
  MedicationRule,
  MedicationRiskInput,
  MedicationRiskResult,
  VitalRule,
  LabRule,
  RiskLevel,
} from "./types";

import { medicationRulesByGeneric } from "./medicationRules";

/**
 * Evaluate a single vital rule against the latest vitals.
 */
function evaluateVitalRule(
  latestVitals: any[],
  rules?: VitalRule[]
): string[] {
  if (!rules) return [];

  const reasons: string[] = [];

  for (const rule of rules) {
    const v = latestVitals.find((x) => x.type === rule.type);
    if (!v) continue;

    const value = v.value;

    if (rule.lowDanger !== undefined && value < rule.lowDanger) {
      reasons.push(`${rule.type.replace(/_/g, " ")} critically low (${value}).`);
    } else if (rule.lowWarning !== undefined && value < rule.lowWarning) {
      reasons.push(`${rule.type.replace(/_/g, " ")} low (${value}).`);
    }

    if (rule.highDanger !== undefined && value > rule.highDanger) {
      reasons.push(`${rule.type.replace(/_/g, " ")} critically high (${value}).`);
    } else if (rule.highWarning !== undefined && value > rule.highWarning) {
      reasons.push(`${rule.type.replace(/_/g, " ")} high (${value}).`);
    }
  }

  return reasons;
}

/**
 * Evaluate a single lab rule against the latest labs.
 */
function evaluateLabRule(
  latestLabs: any[],
  rules?: LabRule[]
): string[] {
  if (!rules) return [];

  const reasons: string[] = [];

  for (const rule of rules) {
    const l = latestLabs.find((x) => x.type === rule.type);
    if (!l) continue;

    const value = l.value;

    if (rule.lowDanger !== undefined && value < rule.lowDanger) {
      reasons.push(`${rule.type} critically low (${value}).`);
    } else if (rule.lowWarning !== undefined && value < rule.lowWarning) {
      reasons.push(`${rule.type} low (${value}).`);
    }

    if (rule.highDanger !== undefined && value > rule.highDanger) {
      reasons.push(`${rule.type} critically high (${value}).`);
    } else if (rule.highWarning !== undefined && value > rule.highWarning) {
      reasons.push(`${rule.type} high (${value}).`);
    }
  }

  return reasons;
}

/**
 * Combine all suggestions based on rule monitoring, vitals, labs, and rationale.
 */
function buildSuggestions(rule: MedicationRule): string[] {
  const suggestions: string[] = [];

  // vitals
  if (rule.monitoring?.vitals) {
    suggestions.push(
      ...rule.monitoring.vitals.map((v) =>
        `Monitor ${v.type.replace(/_/g, " ")} (${v.rationale})`
      )
    );
  }

  // labs
  if (rule.monitoring?.labs) {
    suggestions.push(
      ...rule.monitoring.labs.map(
        (l) => `Check ${l.type.toUpperCase()} (${l.rationale})`
      )
    );
  }

  // general notes
  if (rule.notes) {
    suggestions.push(rule.notes);
  }

  return suggestions;
}

/**
 * Compute overall medication risk.
 */
export function evaluateMedicationRisk(
  input: MedicationRiskInput
): MedicationRiskResult {
  const { medication, latestVitals, latestLabs } = input;

  const generic = medication.genericName?.toLowerCase();
  const rule: MedicationRule | undefined = medicationRulesByGeneric[generic];

  // no rule found
  if (!rule) {
    return {
      level: "green",
      summary: `No rule found for ${medication.name}.`,
      detail: "",
      reasons: [],
      suggestions: [],
    };
  }

  const reasonsVitals = evaluateVitalRule(
    latestVitals,
    rule.monitoring?.vitals
  );

  const reasonsLabs = evaluateLabRule(
    latestLabs,
    rule.monitoring?.labs
  );

  const reasons = [...reasonsVitals, ...reasonsLabs];

  // Compute risk level
  let level: RiskLevel = "green";
  if (reasons.length > 0) level = "yellow";
  if (reasons.some((r) => r.includes("critically"))) level = "red";

  return {
    level,
    summary: `Risk assessment for ${rule.displayName}.`,
    detail: rule.notes ?? "",
    reasons,
    suggestions: buildSuggestions(rule),
  };
}
