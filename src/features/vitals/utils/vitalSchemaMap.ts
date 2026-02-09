// src/features/vitals/utils/vitalSchemaMap.ts

import type { VitalType } from "../types";
import type { Vital } from "../../patient/models/patientSchemas";

/**
 * This file is the SINGLE SOURCE OF TRUTH for converting:
 * - Patient intake / chart schema vitals (long names, string values)
 * into
 * - Vitals engine types (short codes) + normalized numeric values.
 *
 * Key agreements:
 * - Height is stored/handled as inches
 * - Weight is stored/handled as pounds
 * - BMI is computed only (not stored as a vital)
 */

// ----------------------------
// Type Mapping (Schema -> Engine)
// ----------------------------

export function schemaVitalToVitalType(v: Pick<Vital, "type">): VitalType | null {
  switch (v.type) {
    case "bloodPressure":
      return "bp";
    case "heartRate":
      return "hr";
    case "oxygenSaturation":
      return "spo2";
    case "temperature":
      return "temp";
    case "weight":
      return "weight";
    case "height":
      return "height";

    // Not supported by V1 vitals cards/storage yet
    case "bloodSugar":
    case "other":
    default:
      return null;
  }
}

// ----------------------------
// Parsing Helpers
// ----------------------------

/** Safe parse numeric value from messy strings like "180 lbs", "98.6°F", "120" */
export function parseVitalValueNumber(raw: string): number | null {
  if (!raw) return null;

  // Keep digits, dot, minus (just in case), remove everything else
  const cleaned = String(raw).trim().replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Parse BP strings like "120/80", "120 / 80", "120-80" */
export function parseBloodPressure(raw: string): { systolic: number; diastolic: number } | null {
  if (!raw) return null;

  const cleaned = String(raw).trim();

  // Most common: 120/80
  let m = cleaned.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!m) {
    // Some people type 120-80
    m = cleaned.match(/(\d{2,3})\s*-\s*(\d{2,3})/);
  }
  if (!m) return null;

  const sys = Number(m[1]);
  const dia = Number(m[2]);

  if (!Number.isFinite(sys) || !Number.isFinite(dia)) return null;
  return { systolic: sys, diastolic: dia };
}

/**
 * Normalize weight input to pounds (lb).
 * Supports:
 * - "180", units "lb"/"lbs"
 * - "82", units "kg"
 * - raw strings like "180 lbs", "82kg"
 */
export function normalizeWeightToLb(valueRaw: string, unitsRaw?: string): number | null {
  const units = String(unitsRaw ?? "").trim().toLowerCase();
  const v = parseVitalValueNumber(valueRaw);
  if (v == null) return null;

  // If units says kg OR raw contains kg -> convert
  const raw = String(valueRaw ?? "").toLowerCase();
  const isKg = units.includes("kg") || raw.includes("kg");

  if (isKg) {
    // 1 kg = 2.2046226218 lb
    const lb = v * 2.2046226218;
    return roundTo(lb, 1);
  }

  // Default assume pounds
  return roundTo(v, 1);
}

/**
 * Normalize height input to inches (in).
 * Supports:
 * - "70", units "in"
 * - "180", units "cm"
 * - "5'10" or "5' 10" or "5 ft 10"
 * - "5.10" (common mistake — we do NOT treat as feet.decimal; we attempt fallback)
 */
export function normalizeHeightToIn(valueRaw: string, unitsRaw?: string): number | null {
  const units = String(unitsRaw ?? "").trim().toLowerCase();
  const raw = String(valueRaw ?? "").trim().toLowerCase();

  // 1) Feet/inches patterns: 5'10, 5' 10, 5 ft 10, 5ft10in
  // Capture feet and optional inches
  const ftInMatch = raw.match(
    /(\d{1,2})\s*(?:ft|feet|')\s*(\d{1,2})?\s*(?:in|inch|inches|")?/
  );
  if (ftInMatch) {
    const ft = Number(ftInMatch[1]);
    const inch = ftInMatch[2] ? Number(ftInMatch[2]) : 0;
    if (Number.isFinite(ft) && Number.isFinite(inch)) {
      const total = ft * 12 + inch;
      if (total > 0) return roundTo(total, 0);
    }
  }

  // 2) If units says cm OR raw contains cm -> cm to inches
  const numeric = parseVitalValueNumber(valueRaw);
  if (numeric == null) return null;

  const isCm = units.includes("cm") || raw.includes("cm");
  if (isCm) {
    // 1 inch = 2.54 cm
    const inches = numeric / 2.54;
    return roundTo(inches, 0);
  }

  // 3) If units says meters -> meters to inches
  const isMeters = units === "m" || units.includes("meter");
  if (isMeters) {
    const inches = numeric * 39.37007874;
    return roundTo(inches, 0);
  }

  // 4) Default assume inches
  return roundTo(numeric, 0);
}

/**
 * Normalize temperature to Fahrenheit by default.
 * Supports:
 * - units "c" / "°c" -> convert to F
 * - units "f" / "°f" -> use as-is
 * If units missing, assume Fahrenheit.
 */
export function normalizeTempToF(valueRaw: string, unitsRaw?: string): number | null {
  const units = String(unitsRaw ?? "").trim().toLowerCase();
  const raw = String(valueRaw ?? "").toLowerCase();

  const v = parseVitalValueNumber(valueRaw);
  if (v == null) return null;

  const isC = units.includes("c") || raw.includes("°c") || raw.includes(" c");
  const isF = units.includes("f") || raw.includes("°f") || raw.includes(" f");

  if (isC && !isF) {
    const f = v * (9 / 5) + 32;
    return roundTo(f, 1);
  }

  // Default assume Fahrenheit
  return roundTo(v, 1);
}

/** Normalize SpO2 to a clean percent number (0–100). */
export function normalizeSpo2(valueRaw: string): number | null {
  const v = parseVitalValueNumber(valueRaw);
  if (v == null) return null;
  // clamp 0..100
  const clamped = Math.max(0, Math.min(100, v));
  return roundTo(clamped, 0);
}

// ----------------------------
// Date Normalization
// ----------------------------

/**
 * Patient schema uses `date?: string` sometimes "YYYY-MM-DD".
 * We normalize that to a timestampMs.
 * If missing/invalid -> null and caller can use Date.now().
 */
export function schemaDateToTimestampMs(dateRaw?: string): number | null {
  if (!dateRaw) return null;

  const s = String(dateRaw).trim();
  if (!s) return null;

  // If it's ISO-ish, Date.parse can handle it.
  const ms = Date.parse(s);
  if (Number.isFinite(ms)) return ms;

  // If it's "YYYY-MM-DD" strictly
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d, 12, 0, 0); // noon local to avoid timezone midnight shifts
    const t = dt.getTime();
    return Number.isFinite(t) ? t : null;
  }

  return null;
}

// ----------------------------
// Main Normalizer (Schema -> Engine-ready payload)
// ----------------------------

export type NormalizedVitalFromSchema =
  | {
      type: "bp";
      timestampMs: number | null;
      systolic: number;
      diastolic: number;
      source: "schema";
    }
  | {
      type: Exclude<VitalType, "bp">;
      timestampMs: number | null;
      value: number;
      source: "schema";
    };

/**
 * Convert ONE schema vital into a normalized vitals-engine payload.
 * This does NOT write to Firestore. It just normalizes.
 */
export function normalizeSchemaVital(v: Vital): NormalizedVitalFromSchema | null {
  const type = schemaVitalToVitalType(v);
  if (!type) return null;

  const timestampMs = schemaDateToTimestampMs(v.date) ?? null;

  if (type === "bp") {
    const bp = parseBloodPressure(v.value);
    if (!bp) return null;
    return {
      type: "bp",
      timestampMs,
      systolic: bp.systolic,
      diastolic: bp.diastolic,
      source: "schema",
    };
  }

  // Non-BP handling with normalization rules
  if (type === "weight") {
    const lb = normalizeWeightToLb(v.value, v.units);
    if (lb == null) return null;
    return { type, timestampMs, value: lb, source: "schema" };
  }

  if (type === "height") {
    const inches = normalizeHeightToIn(v.value, v.units);
    if (inches == null) return null;
    return { type, timestampMs, value: inches, source: "schema" };
  }

  if (type === "temp") {
    const f = normalizeTempToF(v.value, v.units);
    if (f == null) return null;
    return { type, timestampMs, value: f, source: "schema" };
  }

  if (type === "spo2") {
    const p = normalizeSpo2(v.value);
    if (p == null) return null;
    return { type, timestampMs, value: p, source: "schema" };
  }

  // Default: just numeric parse
  const n = parseVitalValueNumber(v.value);
  if (n == null) return null;
  return { type, timestampMs, value: n, source: "schema" };
}

// ----------------------------
// BMI (computed only)
// ----------------------------

/**
 * BMI = (weightLb * 703) / (heightIn^2)
 * Returns null if inputs invalid.
 */
export function computeBmi(weightLb: number | null | undefined, heightIn: number | null | undefined) {
  const w = typeof weightLb === "number" ? weightLb : null;
  const h = typeof heightIn === "number" ? heightIn : null;
  if (!w || !h || h <= 0) return null;

  const bmi = (w * 703) / (h * h);
  if (!Number.isFinite(bmi)) return null;

  return roundTo(bmi, 1);
}

// ----------------------------
// Small helpers
// ----------------------------

function roundTo(n: number, decimals: number) {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}
