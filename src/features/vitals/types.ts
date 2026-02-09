// src/features/vitals/types.ts

// ----------------------------
// Vital Types
// ----------------------------
export type VitalType = "bp" | "hr" | "spo2" | "rr" | "temp" | "weight" | "height";

/**
 * Risk Engine Types
 */
export type RiskLevel = "green" | "yellow" | "red";

export interface VitalRiskAssessment {
  type: VitalType;
  label: string;
  level: RiskLevel;
  message: string;

  // ✅ used by vitalRiskService.ts / dashboard scoring
  numericScore?: number; // 0–100
  recommendAction?: string; // optional CTA text

  // for HR, SpO₂, weight, temp, height, etc.
  recentValues?: number[];

  // blood pressure specific
  recentSystolic?: number[];
  recentDiastolic?: number[];

  // ✅ optional: used by dashboard/timeline dedupe in some builds
  safetyDedupeKey?: string;
}

/**
 * ✅ Firestore/raw stored record shape
 */
export interface VitalRecord {
  id?: string;
  userId?: string;
  type: VitalType;

  // ✅ single, consistent timestamp type for storage + queries
  timestampMs: number;

  notes?: string | null;

  // Generic vital values (HR, SpO2, RR, temp, weight, height)
  value?: number;

  // BP-specific
  systolic?: number;
  diastolic?: number;
}

// ----------------------------
// Display Types (used for cards UI)
// ----------------------------
export type TrendDirection = "up" | "down" | "steady";

// ✅ Card history can be either numbers (most vitals) or BP pairs (bp)
export type VitalHistoryPoint = number | { systolic: number; diastolic: number };

export interface VitalDisplayItem {
  type: VitalType;
  label: string;
  icon: string; // Feather icon name
  color: string;

  /**
   * numeric value for sorting/logic when applicable (e.g. hr/spo2/temp/weight/rr/height)
   * bp will typically leave this null and use displayValue + history pairs
   */
  value: number | null;

  displayValue: string;
  trend: TrendDirection;

  history: VitalHistoryPoint[];

  // ✅ optional helper used by some screens
  latestTimestampMs?: number | null;

  // Previous for delta (non-BP)
  previousValue?: number | null;

  // Previous for delta (BP)
  previousSystolic?: number | null;
  previousDiastolic?: number | null;
}

export interface PatientVitalsRiskSummary {
  assessments: VitalRiskAssessment[];
  overallLevel: RiskLevel;
}

// ----------------------------
// Insights / trend analysis typing
// ----------------------------

/**
 * ✅ Vitals trend/insights result from trendAnalysisService.analyzeVitals(...)
 * Keep this intentionally broad but structured so we stop importing a missing type.
 */
export interface VitalInsights {
  trend: TrendDirection;
  message?: string;

  // Optional numeric stats (if your service provides them)
  min?: number;
  max?: number;
  avg?: number;
  latest?: number;
  previous?: number;
  delta?: number;
}
