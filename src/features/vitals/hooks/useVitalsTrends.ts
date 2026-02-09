// src/features/vitals/hooks/useVitalsTrends.ts

export interface VitalsTrendsResult {
  trendLabel: string;
  trendColor: string;
  insightText: string;
  aiSummary: string;
}

/**
 * useVitalsTrends
 * ---------------
 * Simple utility that takes chart values and a label and returns
 * a human-friendly trend description + text you can feed to the AI.
 *
 * NOTE: This is a plain function, not a React hook with state.
 */
export const useVitalsTrends = (
  values: number[],
  label: string
): VitalsTrendsResult => {
  if (!values || values.length < 2) {
    const msg = `Not enough ${label.toLowerCase()} data yet to analyze a trend.`;
    return {
      trendLabel: "Not enough data",
      trendColor: "#6b7280", // gray
      insightText: msg,
      aiSummary: msg,
    };
  }

  const first = values[0];
  const last = values[values.length - 1];

  const diff = last - first;
  const pctChange = first !== 0 ? (diff / first) * 100 : 0;

  let trendLabel = "Stable";
  let trendColor = "#6b7280"; // gray
  let directionText =
    "has been relatively stable over the recent measurements.";

  if (pctChange > 5) {
    trendLabel = "Rising";
    trendColor = "#16a34a"; // green
    directionText = "shows an upward trend over the recent measurements.";
  } else if (pctChange < -5) {
    trendLabel = "Falling";
    trendColor = "#ef4444"; // red
    directionText = "shows a downward trend over the recent measurements.";
  }

  const insightText = `${label} ${directionText} Approximate change: ${pctChange.toFixed(
    1
  )}% from the earliest to the latest value.`;

  const aiSummary = `Trend summary for ${label}: ${trendLabel}. The values changed by about ${pctChange.toFixed(
    1
  )}% over the recent time window. Use this information along with the patient's context and clinical ranges to decide if any action is needed.`;

  return {
    trendLabel,
    trendColor,
    insightText,
    aiSummary,
  };
};
