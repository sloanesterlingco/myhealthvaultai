// src/features/riskEngine/riskEngine.ts

import { evaluateRuleBased } from "./riskRules";
import { evaluateAI } from "./riskAI";
import { PatientProfile } from "../patient/models/patientSchemas";

export async function evaluateRisk(profile: PatientProfile) {
  const ruleAlerts = evaluateRuleBased(profile);
  const aiAlerts = await evaluateAI(profile);

  const combined = [...ruleAlerts, ...(aiAlerts.aiRisks ?? [])];

  const highest = combined.reduce((acc, r) => {
    const order = ["GREEN", "YELLOW", "RED", "RED_PLUS"];
    return order.indexOf(r.level) > order.indexOf(acc.level) ? r : acc;
  }, { level: "GREEN" } as any);

  return {
    highestSeverity: highest.level,
    alerts: combined,
  };
}
