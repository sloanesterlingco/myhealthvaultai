// src/features/vitals/hooks/useAddVital.ts

import { useMemo, useState } from "react";
import { vitalsService } from "../services/vitalsService";
import type { VitalType } from "../services/vitalsRepository";

// ✅ Logs vitals into the medical timeline
import { timelineService } from "../../medicalTimeline/services/timelineService";
import type { TimelineEvent, TimelineEventType } from "../../medicalTimeline/services/timelineTypes";

function labelForType(type: VitalType) {
  switch (type) {
    case "bp":
      return "Blood Pressure";
    case "hr":
      return "Heart Rate";
    case "spo2":
      return "Blood Oxygen";
    case "rr":
      return "Respiratory Rate";
    case "temp":
      return "Temperature";
    case "weight":
      return "Weight";
    case "height":
      return "Height";
    default:
      return "Vital";
  }
}

function unitForType(type: VitalType) {
  switch (type) {
    case "hr":
      return "bpm";
    case "spo2":
      return "%";
    case "rr":
      return "breaths/min";
    case "temp":
      return "°F";
    case "weight":
      return "lb";
    case "height":
      return "in";
    default:
      return "";
  }
}

function toYmd(ms: number) {
  const d = new Date(ms);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDayMs(input: Date | number) {
  const d = typeof input === "number" ? new Date(input) : input;
  const s = new Date(d);
  s.setHours(12, 0, 0, 0); // noon avoids timezone edge weirdness on some devices
  return s.getTime();
}

async function safeUpsertTimelineEvent(input: {
  type: TimelineEventType;
  summary: string;
  detail?: string;
  notes?: string | null;
  timestamp: number;
  level: "low" | "moderate" | "high";
  date?: string;
  meta?: Record<string, any>;
}) {
  try {
    const ts = input.timestamp ?? Date.now();

    const dedupeKey = input.meta?.dedupeKey;
    const id =
      typeof dedupeKey === "string" && dedupeKey.length > 0 ? dedupeKey : `event-${ts}`;

    const event: TimelineEvent = {
      id,
      type: input.type,
      summary: input.summary,
      detail: input.detail,
      notes: input.notes ?? null,
      timestamp: ts,
      date: input.date ?? toYmd(ts),
      level: input.level,
      meta: input.meta ?? {},
      title: input.summary,
    };

    await timelineService.upsertEvent(event);
  } catch {
    // ignore timeline failures
  }
}

type UseAddVitalOptions = {
  /** If set, saves with this date instead of "now" */
  selectedDate?: Date | number | null;

  /**
   * If true, we use the selected date at midday (stable across timezones).
   * If false, we use its exact timestamp.
   */
  normalizeSelectedDateToMidday?: boolean;
};

export function useAddVital(type: VitalType, options?: UseAddVitalOptions) {
  const [value, setValue] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const resolvedTimestampMs = useMemo(() => {
    const sd = options?.selectedDate ?? null;
    if (!sd) return Date.now();

    const ms =
      options?.normalizeSelectedDateToMidday === false
        ? typeof sd === "number"
          ? sd
          : sd.getTime()
        : startOfDayMs(sd);

    return ms;
  }, [options?.selectedDate, options?.normalizeSelectedDateToMidday]);

  const saveVital = async (): Promise<boolean> => {
    try {
      setLoading(true);

      const tsMs = resolvedTimestampMs;
      const label = labelForType(type);
      const cleanNotes = notes?.trim() ? notes.trim() : "";
      const notesOrNull = cleanNotes ? cleanNotes : null;

      if (type === "bp") {
        const sys = Number(systolic);
        const dia = Number(diastolic);
        if (!Number.isFinite(sys) || !Number.isFinite(dia) || sys <= 0 || dia <= 0) {
          return false;
        }

        await vitalsService.addVital({
          type,
          systolic: sys,
          diastolic: dia,
          notes: cleanNotes,
          timestampMs: tsMs,
        });

        await safeUpsertTimelineEvent({
          type: "VITAL",
          summary: `${label}: ${sys}/${dia} mmHg`,
          detail: cleanNotes ? cleanNotes : undefined,
          notes: notesOrNull,
          timestamp: tsMs,
          level: "low",
          date: toYmd(tsMs),
          meta: {
            source: "vitals",
            vitalType: type,
            systolic: sys,
            diastolic: dia,
            unit: "mmHg",
            dedupeKey: `vital-${type}-${tsMs}`,
          },
        });

        return true;
      }

      const v = Number(value);
      if (!Number.isFinite(v) || v <= 0) return false;

      const unit = unitForType(type);

      await vitalsService.addVital({
        type,
        value: v,
        notes: cleanNotes,
        timestampMs: tsMs,
      });

      await safeUpsertTimelineEvent({
        type: "VITAL",
        summary: `${label}: ${v}${unit ? ` ${unit}` : ""}`,
        detail: cleanNotes ? cleanNotes : undefined,
        notes: notesOrNull,
        timestamp: tsMs,
        level: "low",
        date: toYmd(tsMs),
        meta: {
          source: "vitals",
          vitalType: type,
          value: v,
          unit,
          dedupeKey: `vital-${type}-${tsMs}`,
        },
      });

      return true;
    } catch (e) {
      console.log("saveVital error:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    value,
    setValue,
    systolic,
    setSystolic,
    diastolic,
    setDiastolic,
    notes,
    setNotes,
    loading,
    saveVital,
  };
}
