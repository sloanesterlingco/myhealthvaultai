// src/features/vitals/hooks/useVitalHistory.ts

import { useCallback, useEffect, useState } from "react";
import trendAnalysisService from "../services/trendAnalysisService";
import { vitalsService } from "../services/vitalsService";
import type { VitalRecord, VitalType, VitalInsights } from "../types";
import { debugAlert } from "../../../utils/debug";

function toVitalInsights(values: number[]): VitalInsights {
  const result = trendAnalysisService.analyzeVitals(values);

  const latest = values.length ? values[values.length - 1] : undefined;
  const previous = values.length >= 2 ? values[values.length - 2] : undefined;
  const delta =
    typeof latest === "number" && typeof previous === "number"
      ? Number((latest - previous).toFixed(1))
      : undefined;

  const message =
    !values.length
      ? "No recent values yet."
      : result.direction === "up"
      ? "Trending up recently."
      : result.direction === "down"
      ? "Trending down recently."
      : "Stable trend recently.";

  return {
    trend: result.direction,
    message,
    min: result.stats?.min,
    max: result.stats?.max,
    avg: result.stats?.avg,
    latest,
    previous,
    delta,
  };
}

export function useVitalHistory(type: VitalType) {
  const [history, setHistory] = useState<VitalRecord[]>([]);
  const [chartValues, setChartValues] = useState<number[]>([]);
  const [insights, setInsights] = useState<VitalInsights | null>(null);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);

      const itemsRaw = await vitalsService.getVitalHistory(type, 50);
      const items = itemsRaw as VitalRecord[];

      setHistory(items);

      const values = items
        .slice(0, 30)
        .reverse()
        .map((v) => {
          if (type === "bp") return Number(v.systolic ?? 0);
          return Number(v.value ?? 0);
        });

      setChartValues(values);

      // ✅ No casting. Convert TrendAnalysisResult -> VitalInsights
      setInsights(toVitalInsights(values));
    } catch (e) {
      await debugAlert(
        "Vital History Load Error (DEBUG)",
        e,
        "We couldn’t load vital history right now."
      );
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    chartValues,
    insights,
    loading,
    refresh: loadHistory,
  };
}
