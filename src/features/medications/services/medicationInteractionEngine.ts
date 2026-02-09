// src/features/medications/services/medicationInteractionEngine.ts

import {
  MedicationForRisk,
  InteractionAgent,
  InteractionCheckInput,
  DetectedInteraction,
} from "./types";
import { medicationRulesByGeneric } from "./medicationRules";
import { medicationInteractionRules } from "./interactionRules";

/** Does this medication match the rule agent (by class and/or generic name)? */
function medMatchesAgent(med: MedicationForRisk, agent: InteractionAgent): boolean {
  const generic = med.genericName.toLowerCase();

  // Match by explicit generic name
  if (agent.genericName && generic === agent.genericName.toLowerCase()) {
    return true;
  }

  // Match by medication class (via medicationRulesByGeneric)
  if (agent.medicationClass) {
    const rule = medicationRulesByGeneric[generic];
    const classes = rule?.classes ?? [];
    return classes.includes(agent.medicationClass);
  }

  return false;
}

/**
 * Evaluate all known interaction rules against the patient's active medications.
 */
export function evaluateMedicationInteractions(
  input: InteractionCheckInput
): DetectedInteraction[] {
  const { medications } = input;
  const results: DetectedInteraction[] = [];

  if (!medications || medications.length < 2) {
    return results;
  }

  for (const rule of medicationInteractionRules) {
    const [agentA, agentB] = rule.agents;

    const groupA = medications.filter((m) => medMatchesAgent(m, agentA));
    const groupB = medications.filter((m) => medMatchesAgent(m, agentB));

    if (groupA.length === 0 || groupB.length === 0) continue;

    // Collect all unique medications involved
    const map = new Map<string, MedicationForRisk>();
    [...groupA, ...groupB].forEach((m) => map.set(m.id, m));

    const involved = Array.from(map.values());
    if (involved.length < 2) continue;

    results.push({
      ruleId: rule.id,
      severity: rule.severity,
      summary: rule.summary,
      details: rule.details,
      medicationsInvolved: involved,
      monitoring: rule.monitoring ?? [],
    });
  }

  return results;
}
