// src/features/riskEngine/riskRules.ts

import { PatientProfile } from "../patient/models/patientSchemas";

export type RiskLevel = "GREEN" | "YELLOW" | "RED" | "RED_PLUS";

export interface RuleResult {
  level: RiskLevel;
  message: string;
  trigger: string;
}

export function evaluateRuleBased(profile: PatientProfile): RuleResult[] {
  const alerts: RuleResult[] = [];

  const vitals = profile.vitals ?? [];
  const symptoms = profile.symptoms ?? [];
  const labs = profile.labs ?? [];
  const meds = profile.medications ?? [];

  // --- Example Rules ---

  // 1. Hypertensive crisis
  vitals.forEach((v) => {
    if (v.type === "bloodPressure" && v.value) {
      const [sys, dia] = v.value.split("/").map((x) => Number(x));

      if (sys >= 180 || dia >= 120) {
        alerts.push({
          level: "RED",
          message: `BP ${sys}/${dia} indicates hypertensive crisis`,
          trigger: "bloodPressure",
        });
      }
    }
  });

  // 2. Low oxygen saturation
  vitals.forEach((v) => {
    if (v.type === "oxygenSaturation" && Number(v.value) < 92) {
      alerts.push({
        level: "RED",
        message: "Low oxygen saturation (<92%) may indicate hypoxia",
        trigger: "oxygenSaturation",
      });
    }
  });

  // 3. Severe pain symptom (>8)
  symptoms.forEach((s) => {
    if (typeof s.intensity === "number" && s.intensity >= 8) {
      alerts.push({
        level: "YELLOW",
        message: `Severe symptom intensity (${s.intensity}/10)`,
        trigger: "symptom",
      });
    }
  });

  // 4. Suicidal ideation keyword detection
  symptoms.forEach((s) => {
    const text = s.description.toLowerCase();
    if (
      text.includes("suicidal") ||
      text.includes("kill myself") ||
      text.includes("self harm")
    ) {
      alerts.push({
        level: "RED_PLUS",
        message: "Possible suicidal ideation detected",
        trigger: "symptom",
      });
    }
  });

  // 5. Blood sugar < 55 (danger)
  vitals.forEach((v) => {
    if (v.type === "bloodSugar" && Number(v.value) < 55) {
      alerts.push({
        level: "RED",
        message: "Critically low blood sugar (<55 mg/dL)",
        trigger: "bloodSugar",
      });
    }
  });

  // 6. Medication interactions (simple example)
  const medNames = meds.map((m) => m.name.toLowerCase());
  if (medNames.includes("sertraline") && medNames.includes("tramadol")) {
    alerts.push({
      level: "RED",
      message: "Serotonin syndrome interaction risk (SSRI + Tramadol)",
      trigger: "medications",
    });
  }

  return alerts;
}
