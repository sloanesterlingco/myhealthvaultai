// src/features/medications/services/types.ts
//
// Medication Risk Engine Types (v1)
//
// NOTE:
// This file was previously overwritten with TimelineEvent types.
// We are restoring the medication risk types required by:
// - medicationRiskEngine.ts
// - medicationSafetyPrompt.ts
// - medicationSafetyAIService.ts
// - MedicationDetailScreen.tsx

// ----------------------------
// Risk Levels
// ----------------------------
export type RiskLevel = "green" | "yellow" | "red";

// ----------------------------
// Snapshot Types (inputs to risk engine)
// ----------------------------
export type PatientSex = "male" | "female" | "other" | "unknown";

export interface PatientSnapshot {
  id: string;
  age: number;
  sex: PatientSex;
  conditions: string[];
}

export type VitalTypeSnapshot =
  | "systolic_bp"
  | "diastolic_bp"
  | "heart_rate"
  | "spo2"
  | "rr"
  | "temp"
  | "weight";

export interface VitalSnapshot {
  type: VitalTypeSnapshot;
  value: number;
  unit: string;
  recordedAt: number; // unix ms
}

export type LabTypeSnapshot =
  | "a1c"
  | "ldl"
  | "hdl"
  | "total_cholesterol"
  | "creatinine"
  | "egfr"
  | "tsh";

export interface LabSnapshot {
  type: LabTypeSnapshot;
  value: number;
  unit: string;
  recordedAt: number; // unix ms
}

// ----------------------------
// Medication Types
// ----------------------------
export interface MedicationForRisk {
  id: string;
  name: string;
  genericName: string;
  doseMgPerDay?: number;
}

// ----------------------------
// Rules
// ----------------------------
export interface VitalRule {
  type: VitalTypeSnapshot;
  rationale: string;
  lowWarning?: number;
  lowDanger?: number;
  highWarning?: number;
  highDanger?: number;
}

export interface LabRule {
  type: LabTypeSnapshot;
  rationale: string;
  lowWarning?: number;
  lowDanger?: number;
  highWarning?: number;
  highDanger?: number;
}

export interface MedicationMonitoringRules {
  vitals?: VitalRule[];
  labs?: LabRule[];
}

export interface MedicationRule {
  displayName: string;
  notes?: string;
  monitoring?: MedicationMonitoringRules;
}

// ----------------------------
// Risk Engine Input/Output
// ----------------------------
export interface MedicationRiskInput {
  medication: MedicationForRisk;
  patient: PatientSnapshot;
  latestVitals: VitalSnapshot[];
  latestLabs: LabSnapshot[];
}

export interface MedicationRiskResult {
  level: RiskLevel;
  summary: string;
  detail?: string;
  reasons: string[];
  suggestions: string[];
}

// ----------------------------
// Backwards-compat: TimelineEvent types
// (Some parts of the codebase may have imported these from here by mistake.)
// ----------------------------
export type TimelineEventLevel = "low" | "moderate" | "high";

export interface TimelineEvent {
  id: string;
  type: string;
  summary: string;
  detail?: string;
  timestamp: number; // unix ms
  level: TimelineEventLevel;
}
