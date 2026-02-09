// src/features/vitals/screens/VitalsScreen.tsx

import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import ScreenContainer from "../../../ui/ScreenContainer";
import VitalCard from "../components/VitalCard";
import { Card } from "../../../ui/Card";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

import { useVitalsList } from "../hooks/useVitalsList";
import { computeBmi } from "../utils/vitalSchemaMap";

type ChartRecordBP = { systolic: number; diastolic: number };
type ChartRecordValue = { value: number };

type LatestType = "bp" | "hr" | "spo2" | "weight";
type DeltaDir = "steady" | "up" | "down";

type QuickTile =
  | { kind: "add"; type: any; label: string; icon: keyof typeof Feather.glyphMap }
  | { kind: "bmi"; label: string; icon: keyof typeof Feather.glyphMap };

const LATEST_ORDER: LatestType[] = ["bp", "hr", "spo2", "weight"];

/**
 * ✅ 8 tiles (4×2) for “all possibilities”
 * Includes Height + BMI as requested.
 */
const QUICK_TILES: QuickTile[] = [
  { kind: "add", type: "bp", label: "Blood Pressure", icon: "activity" },
  { kind: "add", type: "hr", label: "Heart Rate", icon: "heart" },
  { kind: "add", type: "spo2", label: "SpO₂", icon: "wind" },
  { kind: "add", type: "temp", label: "Temp", icon: "thermometer" as any },

  { kind: "add", type: "weight", label: "Weight", icon: "bar-chart-2" },
  { kind: "add", type: "height", label: "Height", icon: "maximize-2" },
  { kind: "add", type: "rr", label: "Resp Rate", icon: "cloud" },
  { kind: "bmi", label: "BMI", icon: "percent" },
];

function safeFeatherIcon(name: any): any {
  const exists = (Feather as any)?.glyphMap?.[name];
  return exists ? name : "plus-circle";
}

function labelShort(type: LatestType) {
  switch (type) {
    case "bp":
      return "BP";
    case "hr":
      return "HR";
    case "spo2":
      return "SpO₂";
    case "weight":
      return "Weight";
  }
}

function unitShort(type: LatestType) {
  switch (type) {
    case "bp":
      return "mmHg";
    case "hr":
      return "bpm";
    case "spo2":
      return "%";
    case "weight":
      return "lb";
  }
}

function formatLatest(type: LatestType, item: any) {
  if (!item) return "—";

  if (type === "bp") {
    const sys = item?.history?.[0]?.systolic;
    const dia = item?.history?.[0]?.diastolic;
    if (typeof sys === "number" && typeof dia === "number" && sys > 0 && dia > 0) return `${sys}/${dia}`;
    return "—";
  }

  const v = item?.value;
  if (typeof v === "number" && Number.isFinite(v)) return `${v}`;
  return "—";
}

function formatLastTaken(ts: number | null | undefined) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function deltaForLatest(type: LatestType, item: any): { dir: DeltaDir; text: string } {
  if (!item) return { dir: "steady", text: "—" };

  if (type === "bp") {
    const sys = item?.history?.[0]?.systolic;
    const dia = item?.history?.[0]?.diastolic;
    const prevSys = item?.previousSystolic;
    const prevDia = item?.previousDiastolic;

    if (
      typeof sys !== "number" ||
      typeof dia !== "number" ||
      typeof prevSys !== "number" ||
      typeof prevDia !== "number"
    ) {
      return { dir: "steady", text: "—" };
    }

    const dSys = sys - prevSys;
    const dDia = dia - prevDia;

    let dir: DeltaDir = "steady";
    if (dSys > 0) dir = "up";
    else if (dSys < 0) dir = "down";

    const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
    return { dir, text: `${fmt(dSys)}/${fmt(dDia)}` };
  }

  const v = item?.value;
  const prev = item?.previousValue;

  if (typeof v !== "number" || typeof prev !== "number") return { dir: "steady", text: "—" };

  const d = v - prev;

  let dir: DeltaDir = "steady";
  if (d > 0) dir = "up";
  else if (d < 0) dir = "down";

  const text = d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`;
  return { dir, text };
}

function tileTone(dir: DeltaDir) {
  if (dir === "up") return styles.latestTileUp;
  if (dir === "down") return styles.latestTileDown;
  return styles.latestTileSteady;
}

function arrowIcon(dir: DeltaDir) {
  if (dir === "up") return "arrow-up-right";
  if (dir === "down") return "arrow-down-right";
  return "minus";
}

export default function VitalsScreen() {
  const nav = useNavigation<any>();
  const { vitals, refresh, loading, byType } = useVitalsList();

  const lastUpdatedRef = useRef<number | null>(null);

  const onRefresh = () => {
    lastUpdatedRef.current = Date.now();
    refresh();
  };

  const bmiValue = useMemo(() => {
    const w = byType.get("weight")?.value ?? null;
    const h = byType.get("height")?.value ?? null;

    const weightOk = typeof w === "number" && w > 0;
    const heightOk = typeof h === "number" && h > 0;

    const bmi = computeBmi(weightOk ? w : null, heightOk ? h : null);
    return bmi; // number | null
  }, [byType]);

  const onPressBmi = () => {
    const w = byType.get("weight")?.value ?? null;
    const h = byType.get("height")?.value ?? null;

    const weightOk = typeof w === "number" && w > 0;
    const heightOk = typeof h === "number" && h > 0;

    if (!weightOk) {
      nav.navigate(MainRoutes.ADD_VITAL, { type: "weight", label: "Weight" });
      return;
    }
    if (!heightOk) {
      nav.navigate(MainRoutes.ADD_VITAL, { type: "height", label: "Height" });
      return;
    }

    if (bmiValue == null) {
      Alert.alert("BMI", "Unable to calculate BMI right now.");
      return;
    }

    Alert.alert("BMI", `Your BMI is ${bmiValue}.`);
  };

  return (
    <ScreenContainer
      showHeader
      title="Vitals"
      headerShowLogo={false}
      headerShowAvatar
      scroll
      contentStyle={{ paddingTop: 0 }}
    >
      {/* ---------- LATEST READINGS ---------- */}
      <Card style={styles.latestCard}>
        <View style={styles.latestHeaderRow}>
          <Text style={styles.latestTitle}>Latest readings</Text>

          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.88}
            disabled={loading}
            style={[styles.refreshBtn, loading && { opacity: 0.6 }]}
          >
            <Feather name="refresh-cw" size={16} color={theme.colors.text} />
            <Text style={styles.refreshText}>{loading ? "Refreshing" : "Refresh"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.latestRow}>
            {LATEST_ORDER.map((type) => {
              const item = byType.get(type as any);
              const delta = deltaForLatest(type, item);
              const tone = tileTone(delta.dir);
              const ts = item?.latestTimestampMs ?? null;

              return (
                <View key={type} style={styles.latestTileWrap}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() =>
                      nav.navigate(MainRoutes.VITALS_DETAIL, {
                        type,
                        label: item?.label ?? labelShort(type),
                        color: item?.color,
                      })
                    }
                    style={[styles.latestTile, tone]}
                  >
                    <View style={styles.latestTopRow}>
                      <Text style={styles.latestLabel}>{labelShort(type)}</Text>

                      <TouchableOpacity
                        onPress={() =>
                          nav.navigate(MainRoutes.ADD_VITAL, {
                            type,
                            label: item?.label ?? labelShort(type),
                          })
                        }
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.addAgainBtn}
                        activeOpacity={0.85}
                      >
                        <Feather name="plus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.latestValue}>{formatLatest(type, item)}</Text>
                    <Text style={styles.latestUnit}>{unitShort(type)}</Text>

                    <View style={styles.deltaRow}>
                      <Feather name={arrowIcon(delta.dir) as any} size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.deltaText}>{delta.text}</Text>
                    </View>

                    <Text style={styles.lastTakenText}>{formatLastTaken(ts)}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      {/* ---------- QUICK ADD (8 tiles, 4×2) ---------- */}
      <Card style={styles.quickAddCard}>
        <View style={styles.quickHeaderRow}>
          <Text style={styles.quickTitle}>Quick add</Text>

          <TouchableOpacity onPress={() => nav.navigate(MainRoutes.VITAL_TYPE_PICKER)} activeOpacity={0.85} style={styles.allTypesBtn}>
            <Text style={styles.allTypesText}>All types</Text>
            <Feather name="chevron-right" size={16} color={theme.colors.brand} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_TILES.map((t) => {
            const onPress =
              t.kind === "bmi"
                ? onPressBmi
                : () => nav.navigate(MainRoutes.ADD_VITAL, { type: t.type, label: t.label });

            const subLabel =
              t.kind === "bmi"
                ? bmiValue == null
                  ? "Tap to calculate"
                  : `Now: ${bmiValue}`
                : undefined;

            return (
              <TouchableOpacity key={`${t.kind}-${t.label}`} onPress={onPress} activeOpacity={0.9} style={styles.tile}>
                <View style={styles.tileIconCircle}>
                  <Feather name={safeFeatherIcon(t.icon)} size={18} color={theme.colors.brand} />
                </View>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {t.label}
                </Text>
                {subLabel ? (
                  <Text style={styles.tileSub} numberOfLines={1}>
                    {subLabel}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* ---------- VITAL CARDS ---------- */}
      {vitals.map((vital) => {
        const history = (vital.history ?? []).slice(0, 10);

        const records: ChartRecordBP[] | ChartRecordValue[] =
          vital.type === "bp"
            ? history.map((r: any) => ({
                systolic: Number(r?.systolic ?? 0),
                diastolic: Number(r?.diastolic ?? 0),
              }))
            : history.map((n: any) => ({ value: Number(n ?? 0) }));

        return (
          <VitalCard
            key={vital.type}
            type={vital.type}
            label={vital.label}
            displayValue={vital.displayValue}
            records={records as any}
            onPress={() =>
              nav.navigate(MainRoutes.VITALS_DETAIL, {
                type: vital.type,
                label: vital.label,
                color: vital.color,
              })
            }
          />
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  latestCard: { marginBottom: theme.spacing.md },

  latestHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
    gap: 12,
  },
  latestTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  refreshText: { fontSize: 12, fontWeight: "900", color: theme.colors.text },

  latestRow: { flexDirection: "row", gap: 12, paddingRight: 6 },
  latestTileWrap: { width: 132 },
  latestTile: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
  latestTileSteady: { backgroundColor: "rgba(15, 23, 42, 0.04)", borderColor: "rgba(15, 23, 42, 0.08)" },
  latestTileUp: { backgroundColor: "rgba(59, 130, 246, 0.08)", borderColor: "rgba(59, 130, 246, 0.16)" },
  latestTileDown: { backgroundColor: "rgba(168, 85, 247, 0.08)", borderColor: "rgba(168, 85, 247, 0.16)" },

  latestTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  latestLabel: { fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary },
  addAgainBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },

  latestValue: { marginTop: 2, fontSize: 20, fontWeight: "900", color: theme.colors.text },
  latestUnit: { marginTop: 2, fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary },
  deltaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  deltaText: { fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary },
  lastTakenText: { marginTop: 6, fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary },

  quickAddCard: { marginBottom: theme.spacing.md },
  quickHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md },
  quickTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.text, textTransform: "uppercase" },
  allTypesBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  allTypesText: { fontWeight: "900", fontSize: 13, color: theme.colors.brand },

  // ✅ 4 columns
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: theme.spacing.md },
  tile: { width: "23%", alignItems: "center", paddingVertical: theme.spacing.xs },
  tileIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 7,
  },
  tileLabel: { fontSize: 11, fontWeight: "900", color: theme.colors.textSecondary, textAlign: "center", lineHeight: 14 },
  tileSub: { marginTop: 2, fontSize: 10, fontWeight: "800", color: theme.colors.textSecondary, textAlign: "center" },
});
