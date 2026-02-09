// src/features/vitals/components/VitalCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";

import { Card } from "../../../ui/Card";
import { theme } from "../../../theme";

type BPRecord = { systolic: number; diastolic: number };
type ValueRecord = { value: number };

type Props = {
  type: "bp" | "hr" | "spo2" | "temp" | "weight" | "rr" | "height" | string;
  label: string;
  displayValue?: string;
  records?: Array<BPRecord | ValueRecord>;
  onPress?: () => void;
  secondaryPillText?: string;
};

function getIconForType(type: string): keyof typeof Feather.glyphMap {
  switch (type) {
    case "bp":
      return "activity";
    case "hr":
      return "heart";
    case "spo2":
      return "wind";
    case "temp":
      return "thermometer" as any;
    case "weight":
      return "bar-chart-2";
    case "rr":
      return "cloud";
    case "height":
      return "trending-up";
    default:
      return "activity";
  }
}

function toNumberSafe(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function extractSeries(type: string, records?: Array<BPRecord | ValueRecord>) {
  if (!records || records.length === 0) return { primary: [] as number[], secondary: [] as number[] };

  // ✅ Your arrays are newest-first; reverse to oldest-first for correct trend + chart direction.
  const ordered = [...records].reverse();

  if (type === "bp") {
    const sys = (ordered as BPRecord[]).map((r) => toNumberSafe((r as any)?.systolic));
    const dia = (ordered as BPRecord[]).map((r) => toNumberSafe((r as any)?.diastolic));
    return { primary: sys, secondary: dia };
  }

  const vals = (ordered as ValueRecord[]).map((r) => toNumberSafe((r as any)?.value));
  return { primary: vals, secondary: [] as number[] };
}

function trendFromSeries(series: number[]) {
  if (!series || series.length < 2) return { label: "No trend yet", dir: "flat" as const };

  const first = series[0];
  const last = series[series.length - 1];
  const delta = last - first;

  if (Math.abs(delta) < 0.5) return { label: "Stable", dir: "flat" as const };
  if (delta > 0) return { label: "Trending up", dir: "up" as const };
  return { label: "Trending down", dir: "down" as const };
}

function buildSparkPath(values: number[], width: number, height: number) {
  if (!values || values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-6, max - min);

  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return { x, y };
  });

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  return d;
}

export default function VitalCard({ type, label, displayValue, records, onPress, secondaryPillText }: Props) {
  const icon = getIconForType(type);

  const { primary, secondary } = useMemo(() => extractSeries(type, records), [type, records]);

  const trend = useMemo(() => {
    const base = primary;
    return trendFromSeries(base);
  }, [primary]);

  const sparkW = 110;
  const sparkH = 36;

  const sparkPath = useMemo(() => buildSparkPath(primary, sparkW, sparkH), [primary]);
  const sparkPath2 = useMemo(() => (secondary.length ? buildSparkPath(secondary, sparkW, sparkH) : ""), [secondary]);

  const trendTone = trend.dir === "up" ? styles.trendUp : trend.dir === "down" ? styles.trendDown : styles.trendFlat;
  const trendIcon = trend.dir === "up" ? "arrow-up-right" : trend.dir === "down" ? "arrow-down-right" : "minus";

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.88 : 1} onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.left}>
            <View style={styles.iconCircle}>
              <Feather name={icon} size={18} color={theme.colors.brand} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label} numberOfLines={1}>
                {label}
              </Text>

              <Text style={styles.value} numberOfLines={1}>
                {displayValue && displayValue.trim().length > 0 ? displayValue : "—"}
              </Text>

              <View style={styles.pillsRow}>
                <View style={[styles.trendPill, trendTone]}>
                  <Feather name={trendIcon as any} size={14} color={theme.colors.text} />
                  <Text style={styles.trendText}>{trend.label}</Text>
                </View>

                {secondaryPillText ? (
                  <View style={[styles.secondaryPill]}>
                    <Text style={styles.secondaryPillText} numberOfLines={1}>
                      {secondaryPillText}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.right}>
            {sparkPath ? (
              <View style={styles.sparkWrap}>
                <Svg width={sparkW} height={sparkH}>
                  <Path
                    d={`M 0 ${sparkH - 1} L ${sparkW} ${sparkH - 1}`}
                    stroke="rgba(15, 23, 42, 0.06)"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />

                  {sparkPath2 ? (
                    <Path
                      d={sparkPath2}
                      stroke="rgba(245, 158, 11, 0.90)"
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                    />
                  ) : null}

                  <Path d={sparkPath} stroke={theme.colors.brand} strokeWidth={2.25} fill="none" strokeLinecap="round" />
                </Svg>
              </View>
            ) : (
              <View style={styles.sparkEmpty}>
                <Text style={styles.sparkEmptyText}>No chart yet</Text>
              </View>
            )}

            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  label: { fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary, letterSpacing: 0.6, textTransform: "uppercase" },
  value: { marginTop: 4, fontSize: 18, fontWeight: "900", color: theme.colors.text, letterSpacing: 0.2 },

  pillsRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  trendPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  trendText: { fontSize: 12, fontWeight: "900", color: theme.colors.text },

  trendUp: { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.18)" },
  trendDown: { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.18)" },
  trendFlat: { backgroundColor: "rgba(148,163,184,0.16)", borderColor: "rgba(148,163,184,0.22)" },

  secondaryPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "rgba(15,23,42,0.10)", backgroundColor: "rgba(15,23,42,0.04)" },
  secondaryPillText: { fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary },

  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  sparkWrap: { paddingRight: 2 },
  sparkEmpty: { width: 110, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.04)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(15,23,42,0.08)" },
  sparkEmptyText: { fontSize: 11, fontWeight: "900", color: theme.colors.textSecondary },
});
