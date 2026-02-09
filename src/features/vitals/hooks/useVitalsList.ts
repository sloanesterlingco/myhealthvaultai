// src/features/vitals/hooks/useVitalsList.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { vitalsService } from "../services/vitalsService";
import type { VitalDisplayItem, VitalType } from "../types";
import type { VitalDoc } from "../services/vitalsRepository";

// ✅ Include height now (so it can save + actually show up)
const TYPES: VitalType[] = ["bp", "hr", "spo2", "rr", "temp", "weight", "height"];

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

function colorForType(type: VitalType) {
  switch (type) {
    case "bp":
      return "#6D5EF5";
    case "hr":
      return "#FF5A5F";
    case "spo2":
      return "#2AD4D6";
    case "rr":
      return "#FFA726";
    case "temp":
      return "#EF5350";
    case "weight":
      return "#26A69A";
    case "height":
      return "#8D6E63";
    default:
      return "#64748B";
  }
}

function formatDisplayValue(type: VitalType, latest?: VitalDoc) {
  if (!latest) return "--";

  if (type === "bp") {
    const s = latest.systolic ?? null;
    const d = latest.diastolic ?? null;
    if (s == null || d == null) return "--";
    return `${s}/${d}`;
  }

  if (latest.value == null) return "--";
  return String(latest.value);
}

function iconForType(type: VitalType) {
  switch (type) {
    case "bp":
      return "activity";
    case "hr":
      return "heart";
    case "spo2":
      return "wind";
    case "rr":
      return "cloud";
    case "temp":
      return "thermometer";
    case "weight":
      return "bar-chart-2";
    case "height":
      return "trending-up";
    default:
      return "activity";
  }
}

function safeTimestampMs(r: VitalDoc) {
  const t = Number((r as any)?.timestampMs ?? 0);
  return Number.isFinite(t) ? t : 0;
}

export function useVitalsList() {
  const [vitals, setVitals] = useState<VitalDisplayItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Keep last good snapshot WITHOUT putting it in refresh() dependencies
  const lastGoodVitalsRef = useRef<VitalDisplayItem[]>([]);

  const buildItems = useCallback((all: VitalDoc[]) => {
    const sorted = [...all].sort((a, b) => safeTimestampMs(b) - safeTimestampMs(a));

    const grouped = new Map<VitalType, VitalDoc[]>();
    for (const r of sorted) {
      const t = r.type as VitalType;
      if (!TYPES.includes(t)) continue;
      const arr = grouped.get(t) ?? [];
      arr.push(r);
      grouped.set(t, arr);
    }

    const items: VitalDisplayItem[] = TYPES.map((type) => {
      const byType = grouped.get(type) ?? [];
      const latest = byType[0];
      const prev = byType[1];
      const raw = byType.slice(0, 30);

      return {
        type,
        label: labelForType(type),
        icon: iconForType(type),
        color: colorForType(type),

        value: type === "bp" ? null : latest?.value ?? null,
        displayValue: formatDisplayValue(type, latest),
        trend: "steady",

        history:
          type === "bp"
            ? raw.slice(0, 10).map((r) => ({
                systolic: Number(r.systolic ?? 0),
                diastolic: Number(r.diastolic ?? 0),
              }))
            : raw.slice(0, 10).map((r) => Number(r.value ?? 0)),

        latestTimestampMs: latest?.timestampMs ?? null,

        previousValue: type !== "bp" ? (prev?.value ?? null) : null,
        previousSystolic: type === "bp" ? (prev?.systolic ?? null) : null,
        previousDiastolic: type === "bp" ? (prev?.diastolic ?? null) : null,
      };
    });

    return items;
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      const all = await vitalsService.getAllVitals(250);
      const items = buildItems(all);

      setVitals(items);
      lastGoodVitalsRef.current = items;
    } catch (e) {
      console.log("Vitals list refresh error:", e);
      const fallback = lastGoodVitalsRef.current;
      setVitals(Array.isArray(fallback) ? fallback : []);
    } finally {
      setLoading(false);
    }
  }, [buildItems]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => {};
    }, [refresh])
  );

  const byType = useMemo(() => {
    const map = new Map<VitalType, VitalDisplayItem>();
    for (const v of vitals) map.set(v.type, v);
    return map;
  }, [vitals]);

  return { vitals, loading, refresh, byType };
}
