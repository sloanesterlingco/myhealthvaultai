// src/features/medicalTimeline/services/timelineTypes.ts

// Timeline "level" is used for visual emphasis + filtering.
// V1 originally used low/moderate/high, but other screens already write
// values like "info" and "urgent" (cast as any). We formalize them here
// so the type system matches reality.
export type TimelineEventLevel =
  | "info"
  | "low"
  | "moderate"
  | "high"
  | "warning"
  | "urgent";

// Canonical V1+ event types.
// NOTE: Several features already write custom strings (e.g. RECORD_UPLOAD).
// We explicitly include the ones used across the app to avoid "any" casts.
export type TimelineEventType =
  | "GENERAL"
  | "AI_NOTE"
  | "SAFETY_ALERT"
  | "VITAL"
  | "RECORD_UPLOAD"
  | "MEDICATION_ADDED"
  | "MEDICATION_UPDATED"
  | "MEDICATION_REMOVED"
  | "CHECKIN"
  | "PRE_VISIT_PACK"
  | "LAB_RESULT"
  | "IMAGING_REPORT"
  | "INSURANCE_CARD"
  | "EXPORT_PDF"
  | "EXPORT_QR";

// Deterministic timeline tab/category mapping.
// This is the key to preventing "everything dumps into Records".
export type TimelineCategory =
  | "records"
  | "vitals"
  | "medications"
  | "labs"
  | "imaging"
  | "visits"
  | "insurance"
  | "exports"
  | "warnings"
  | "other";

export type TimelineEvent = {
  id: string;

  // Canonical type + category
  type: TimelineEventType | string;
  category?: TimelineCategory;

  // Human readable text
  summary: string;
  detail?: string;

  // Optional display fields used by older UIs
  title?: string;
  notes?: string | null;

  // Time
  timestamp: number; // ms epoch
  date?: string; // YYYY-MM-DD (local date string)

  // Visual emphasis
  level?: TimelineEventLevel;

  // Extra data
  meta?: Record<string, any>;
};
