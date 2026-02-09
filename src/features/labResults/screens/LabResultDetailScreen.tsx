// src/features/labResults/screens/LabResultDetailScreen.tsx

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  MainRoutes,
  MainRoutesParamList,
} from "../../../navigation/types";
import { theme } from "../../../theme";

import {
  interpretOcrLabRow,
  OcrLabRow,
  ParsedLabValue,
} from "../services/labInterpreter";
import {
  assessLabValueRisk,
  LabRiskAssessment,
} from "../services/labRiskEngine";
import { SexAtBirth } from "../services/labRules";

// ✅ we reuse your vitals trend helper (it’s a plain function, not a React hook)
import { useVitalsTrends } from "../../vitals/hooks/useVitalsTrends";

type LabDetailRoute = RouteProp<
  MainRoutesParamList,
  MainRoutes.LAB_RESULT_DETAIL
>;
type Nav = NativeStackNavigationProp<
  MainRoutesParamList,
  MainRoutes.LAB_RESULT_DETAIL
>;

interface Props {
  navigation: Nav;
}

interface HistoryPoint {
  label: string;
  value: number;
}

/**
 * Try to extract a history array from whatever shape the lab result
 * might be using:
 * - history
 * - previousValues
 * - pastResults
 * - trendValues
 * - valuesOverTime
 *
 * Supports:
 * - number[]
 * - { value, date/timestamp/... }[]
 */
function extractHistoryPoints(result: any): HistoryPoint[] {
  if (!result) return [];

  const candidates = [
    result.history,
    result.previousValues,
    result.pastResults,
    result.trendValues,
    result.valuesOverTime,
  ].filter((arr) => Array.isArray(arr)) as any[][];

  if (!candidates.length) return [];

  const rawArray = candidates[0];

  const points: HistoryPoint[] = rawArray
    .map((entry: any, index: number): HistoryPoint | null => {
      // number[] case
      if (typeof entry === "number") {
        if (Number.isNaN(entry)) return null;
        return {
          label: `#${index + 1}`,
          value: entry,
        };
      }

      if (!entry || typeof entry !== "object") return null;

      const rawVal =
        entry.value ??
        entry.result ??
        entry.numericValue ??
        (entry.valueText ? parseFloat(entry.valueText) : undefined);

      const value = typeof rawVal === "number" ? rawVal : Number(rawVal);

      if (Number.isNaN(value)) return null;

      const rawDate =
        entry.date ??
        entry.collectedAt ??
        entry.collectedOn ??
        entry.timestamp ??
        entry.performedAt ??
        null;

      const label =
        typeof rawDate === "string"
          ? rawDate
          : rawDate instanceof Date
          ? rawDate.toLocaleDateString()
          : `#${index + 1}`;

      return { label, value };
    })
    .filter((p): p is HistoryPoint => !!p);

  return points;
}

/**
 * LabResultDetailScreen
 * ---------------------
 * Shows:
 * - value + units
 * - risk assessment (green / yellow / red)
 * - normal range
 * - concise + detailed risk summary
 * - trend over time (if historical values exist)
 */
export const LabResultDetailScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<LabDetailRoute>();
  const { result } = route.params;

  // Try to guess a display name + raw test name from the passed-in object.
  const rawName: string =
    result?.code ||
    result?.name ||
    result?.testName ||
    result?.labName ||
    "Unknown Test";

  // Try pulling a numeric value / text value
  const rawValue: string =
    typeof result?.value === "number"
      ? String(result.value)
      : (result?.valueText ??
          result?.result ??
          (result?.value != null ? String(result.value) : ""));

  const rawUnit: string | undefined =
    result?.unit || result?.unitText || undefined;

  const refRangeText: string | undefined =
    result?.referenceRange ||
    result?.referenceRangeText ||
    result?.refRange ||
    undefined;

  // If you have sex stored elsewhere (e.g. from patient profile),
  // you can pass that in instead of undefined here.
  const sex: SexAtBirth | undefined = undefined;

  // Build an OCR-like row from this single result so we can reuse
  // the interpreter + risk engine.
  const interpreted: ParsedLabValue | null = useMemo(() => {
    const row: OcrLabRow = {
      rawName,
      valueText: rawValue,
      unitText: rawUnit,
      referenceRangeText: refRangeText,
      flagText: result?.flag || result?.flagText || undefined,
    };

    const parsed = interpretOcrLabRow(row, sex);

    return parsed;
  }, [rawName, rawValue, rawUnit, refRangeText, result, sex]);

  const risk: LabRiskAssessment | null = useMemo(() => {
    if (!interpreted) return null;
    return assessLabValueRisk(interpreted);
  }, [interpreted]);

  const riskColor = risk
    ? risk.level === "red"
      ? "#dc2626"
      : risk.level === "yellow"
      ? "#f59e0b"
      : risk.level === "green"
      ? "#16a34a"
      : theme.colors.textMuted
    : theme.colors.textMuted;

  const normalRangeText = interpreted?.normalRange
    ? `${interpreted.normalRange.min}–${interpreted.normalRange.max} ${interpreted.unit}`
    : "Range not available";

  // ✅ Precompute display strings to avoid mixing ?? and ||
  const displayValue =
    interpreted?.value != null
      ? String(interpreted.value)
      : rawValue || "--";

  const displayUnit =
    interpreted?.unit || rawUnit || "";

  // -----------------------------
  // Trend over time (if history)
  // -----------------------------
  const historyPoints: HistoryPoint[] = useMemo(() => {
    const base = extractHistoryPoints(result);

    // Append current value as final point if numeric
    const numericCurrent =
      interpreted?.value != null
        ? Number(interpreted.value)
        : rawValue
        ? Number(rawValue)
        : NaN;

    if (!Number.isNaN(numericCurrent)) {
      const labelFromResult =
        result?.date ||
        result?.collectedAt ||
        result?.collectedOn ||
        result?.timestamp ||
        "Current";

      return [
        ...base,
        {
          label:
            typeof labelFromResult === "string"
              ? labelFromResult
              : labelFromResult instanceof Date
              ? labelFromResult.toLocaleDateString()
              : "Current",
          value: numericCurrent,
        },
      ];
    }

    return base;
  }, [result, interpreted, rawValue]);

  const valuesForTrend = historyPoints.map((p) => p.value);

  const {
    trendLabel,
    trendColor,
    insightText: trendInsight,
  } = useVitalsTrends(
    valuesForTrend,
    interpreted?.name || rawName
  );

  const hasTrendData = valuesForTrend.length >= 2;

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {interpreted?.name || rawName}
        </Text>

        <Text style={styles.subtitle}>Lab result details</Text>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* VALUE + RISK CARD */}
        <View style={styles.card}>
          <View style={styles.valueRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.valueLabel}>Result</Text>
              <Text style={styles.valueBig}>
                {displayValue}
                {displayUnit ? ` ${displayUnit}` : ""}
              </Text>
            </View>

            {risk && (
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: riskColor },
                ]}
              >
                <Text style={styles.riskBadgeText}>{risk.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>Normal Range</Text>
              <Text style={styles.metaValue}>{normalRangeText}</Text>
            </View>

            {interpreted?.category && (
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Category</Text>
                <Text style={styles.metaValue}>
                  {interpreted.category}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* RISK SUMMARY & DETAIL */}
        {risk && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Risk Summary</Text>
            <Text style={styles.summaryText}>{risk.summary}</Text>

            {risk.detail && (
              <>
                <Text
                  style={[styles.sectionTitle, { marginTop: 16 }]}
                >
                  More Detail
                </Text>
                <Text style={styles.detailText}>{risk.detail}</Text>
              </>
            )}
          </View>
        )}

        {/* TREND OVER TIME */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trend over time</Text>

          {!historyPoints.length ? (
            <Text style={styles.detailText}>
              No previous values for this test yet. Once there are
              multiple results, we&rsquo;ll show how it&rsquo;s changing
              over time.
            </Text>
          ) : (
            <>
              <Text style={styles.trendSummary}>
                Trend:{" "}
                <Text style={{ color: trendColor }}>
                  {trendLabel}
                </Text>
              </Text>

              {hasTrendData ? (
                <Text style={styles.detailText}>
                  {trendInsight}
                </Text>
              ) : (
                <Text style={styles.detailText}>
                  Only one value is available so far. We&rsquo;ll start
                  analyzing trends once there are at least two
                  measurements.
                </Text>
              )}

              <View style={styles.historyTable}>
                {historyPoints.map((point, idx) => (
                  <View
                    key={`${point.label}-${idx}`}
                    style={styles.historyRow}
                  >
                    <Text style={styles.historyLabel}>
                      {point.label}
                    </Text>
                    <Text style={styles.historyValue}>
                      {point.value}
                      {displayUnit ? ` ${displayUnit}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* RAW DATA FALLBACK */}
        {!interpreted && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Could not interpret this lab
            </Text>
            <Text style={styles.detailText}>
              The app could not match this lab to known rules. You can
              still show this result to your clinician.
            </Text>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.metaLabel}>Name</Text>
              <Text style={styles.metaValue}>{rawName}</Text>

              <Text style={[styles.metaLabel, { marginTop: 8 }]}>
                Value
              </Text>
              <Text style={styles.metaValue}>
                {rawValue} {rawUnit ?? ""}
              </Text>

              {refRangeText && (
                <>
                  <Text
                    style={[styles.metaLabel, { marginTop: 8 }]}
                  >
                    Reference Range (raw)
                  </Text>
                  <Text style={styles.metaValue}>{refRangeText}</Text>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default LabResultDetailScreen;

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginBottom: 6,
  },
  backText: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  valueBig: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  riskBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 16,
  },
  metaLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  trendSummary: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: theme.colors.text,
  },
  historyTable: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  historyLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  historyValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
