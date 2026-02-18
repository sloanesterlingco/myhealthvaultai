// src/features/medications/services/types.ts

/**
 * Medication safety rule types
 * These are intentionally permissive for V1 to avoid TypeScript blocking the build.
 * We can tighten these later after V1 ships.
 */

// -------------------------
// Medication Classes
// -------------------------
export type MedicationClass =
  | "ACE_INHIBITOR"
  | "ARB"
  | "BETA_BLOCKER"
  | "CALCIUM_CHANNEL_BLOCKER"
  | "DIURETIC"
  | "NSAID"
  | "ANTICOAGULANT"
  | "ANTIPLATELET"
  | "SSRI"
  | "SNRI"
  | "STATIN"
  | "INSULIN"
  | "OTHER";

// -------------------------
// Vital rules
// -------------------------
export type VitalType =
  | "systolic_bp"
  | "diastolic_bp"
  | "heart_rate"
  | "respiratory_rate"
  | "temperature"
  | "spo2"
  | "weight"
  | "bmi"
  | "glucose";

export type VitalRule = {
  type: VitalType;
  lowWarning?: number;
  lowDanger?: number;
  highWarning?: number;
  highDanger?: number;
  rationale: string;
};

// -------------------------
// Lab rules
// -------------------------
// IMPORTANT: This union must include the strings used in medicationRules.ts
export type LabType =
  | "potassium"
  | "creatinine"
  | "egfr"
  | "bun"
  | "alt"
  | "ast"
  | "inr"
  | "hemoglobin"
  | "platelets"
  | "sodium"
  | "a1c"
  | "ldl"
  | "triglycerides"
  | "wbc"
  | "other";

export type LabRule = {
  type: LabType;
  lowWarning?: number;
  lowDanger?: number;
  highWarning?: number;
  highDanger?: number;
  rationale: string;
};

// -------------------------
// Contraindications
// -------------------------
export type ContraindicationSeverity = "green" | "yellow" | "red";

export type ContraindicationRule = {
  condition: string; // e.g. "pregnancy", "advanced_ckd"
  description: string;
  severity: Exclude<ContraindicationSeverity, "green">; // yellow/red only
};

// -------------------------
// Medication Rule
// -------------------------
export type DoseRangeMgPerDay = {
  min?: number;
  max?: number;
  note?: string;
};

export type MedicationMonitoring = {
  vitals?: VitalRule[];
  labs?: LabRule[];
};

export type MedicationRule = {
  // REQUIRED (used by medicationRulesByGeneric map)
  genericName: string; // e.g. "lisinopril"
  displayName: string; // e.g. "Lisinopril"

  // OPTIONAL
  classes?: MedicationClass[];
  usualAdultDoseRangeMgPerDay?: DoseRangeMgPerDay;

  monitoring?: MedicationMonitoring;

  contraindications?: ContraindicationRule[];

  notes?: string;
};
