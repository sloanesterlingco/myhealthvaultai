// src/features/medicalTimeline/services/timelineTypes.ts

export type TimelineEventLevel = "low" | "moderate" | "high";

export type TimelineEventType = "GENERAL" | "AI_NOTE" | "SAFETY_ALERT" | "VITAL";

export interface TimelineEvent {
  id: string;

  // Core event fields
  type: TimelineEventType;
  summary: string; // Used as the "title" in your UI
  detail?: string;

  // UI expects notes (optional)
  notes?: string | null;

  // Optional date string (YYYY-MM-DD) for user-entered events
  date?: string;

  // unix ms (required)
  timestamp: number;

  level: TimelineEventLevel;

  /**
   * Optional metadata for filtering/dedupe.
   * Example: { source: "vitals", vitalType: "hr", dedupeKey: "hr-123" }
   */
  meta?: Record<string, any>;

  // Virtual field for UI compatibility (screens expecting event.title)
  title?: string;
}
