// src/features/patient/screens/DashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { SectionHeader } from "../../../ui/SectionHeader";
import { Button } from "../../../ui/Button";

import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

import { usePatientProfile } from "../hooks/usePatientProfile";
import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";
import { getDashboardTasks } from "../services/dashboardTasks";

import { vitalsService } from "../../vitals/services/vitalsService";
import { vitalRiskService } from "../../vitals/services/vitalRiskService";
import type { PatientVitalsRiskSummary, VitalRiskAssessment } from "../../vitals/types";

const TEAL = "#0B8E8E"; // keep for icons if you want
const PROGRESS_BLUE = "#1D4ED8"; // rich iOS-ish blue

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/* -------------------- Visit Recorder Launcher -------------------- */

const VISIT_RECORDER_DEEP_LINK = "visitrecorder://";
const VISIT_RECORDER_PLAYSTORE_WEB =
  "https://play.google.com/store/apps/details?id=com.visitrecorder.app";

async function tryOpenUrl(url: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

async function openVisitRecorderApp() {
  if (await tryOpenUrl(VISIT_RECORDER_DEEP_LINK)) return true;
  return false;
}

async function openVisitRecorderPlayStore() {
  try {
    await Linking.openURL(VISIT_RECORDER_PLAYSTORE_WEB);
  } catch {
    // no-op
  }
}

/* -------------------- UI bits -------------------- */

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "yellow" | "green";
}) {
  const tint =
    tone === "red"
      ? theme.colors.danger
      : tone === "yellow"
      ? theme.colors.warning
      : theme.colors.success;

  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function CopilotOverviewCard({ onPress }: { onPress: () => void }) {
  return (
    <Card style={styles.copilotCard}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.copilotRow}
      >
        <View style={styles.copilotLeft}>
          <View style={styles.copilotIconWrap}>
            <Image
              source={require("../../../../assets/images/copilot-ai.png")}
              style={styles.copilotIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.askAiText}>Ask AI</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.copilotTitle}>OpenAI Copilot</Text>
          <Text style={styles.copilotSub}>
            Ask questions, prep for visits, and understand your health.
          </Text>
        </View>

        <Feather
          name="chevron-right"
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
    </Card>
  );
}

function HealthScoreRing({ score, size }: { score: number; size: number }) {
  const radius = size / 2 - 6;
  const circ = 2 * Math.PI * radius;
  const clamped = clamp(score);
  const offset = circ - (clamped / 100) * circ;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(15, 23, 42, 0.10)"
          strokeWidth={10}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={
            clamped >= 70
              ? theme.colors.success
              : clamped >= 40
              ? theme.colors.warning
              : theme.colors.danger
          }
          strokeWidth={10}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.ringCenter}>
        <Text style={styles.ringScoreText}>{Math.round(clamped)}</Text>
        <Text style={styles.ringScoreLabel}>Score</Text>
      </View>
    </View>
  );
}

function UrgentVitalCard({
  item,
  onPress,
}: {
  item: VitalRiskAssessment;
  onPress: () => void;
}) {
  const tint =
    item.level === "red"
      ? theme.colors.danger
      : item.level === "yellow"
      ? theme.colors.warning
      : theme.colors.success;

  return (
    <Card style={styles.urgentCard}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.urgentRow}>
        <View style={[styles.urgentIcon, { backgroundColor: `${tint}18` }]}>
          <Feather
            name={item.level === "red" ? "alert-triangle" : "alert-circle"}
            size={18}
            color={tint}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.urgentTitle}>{item.label ?? "Vital alert"}</Text>
          <Text style={styles.urgentSub} numberOfLines={3}>
            {item.message ?? "Tap to view details."}
          </Text>
        </View>

        <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Card>
  );
}

/* -------------------- Screen -------------------- */

export default function DashboardScreen() {
  const navigation = useNavigation<any>();

  const [risk, setRisk] = useState<PatientVitalsRiskSummary | null>(null);
  const [loadingVitals, setLoadingVitals] = useState(true);

  const { profile, reloadProfile } = usePatientProfile();

  useFocusEffect(
    useCallback(() => {
      try {
        reloadProfile?.();
      } catch {
        // no-op
      }
    }, [reloadProfile])
  );

  const setupPct = useMemo(() => {
    const patient = (patientAggregationService.getPatient?.() ?? {}) as any;
    const tasks = getDashboardTasks({ patient, profile: profile ?? null }).all;

    const total = tasks.length || 1;
    const done = tasks.filter((t: any) => t.status === "done").length;
    return Math.round((done / total) * 100);
  }, [profile]);

  const goPatientProfile = useCallback(() => {
    navigation.navigate(MainRoutes.PATIENT_PROFILE);
  }, [navigation]);

  // Ask AI → AI Chat
  const goAiChat = useCallback(() => {
    navigation.navigate(MainRoutes.AI_HOME_TAB as any, { screen: MainRoutes.AI_CHAT });
  }, [navigation]);

  // Chart CTA → Chart Setup Intro
  const goChartSetup = useCallback(() => {
    navigation.navigate(MainRoutes.AI_HOME_TAB as any, { screen: MainRoutes.CHART_SETUP_INTRO });
  }, [navigation]);

  const onGoToVitals = useCallback(() => {
    navigation.navigate(MainRoutes.VITALS_TAB as any);
  }, [navigation]);

  const onCheckIn = useCallback(() => {
    navigation.navigate(MainRoutes.CHECKIN);
  }, [navigation]);

  const onVisitRecorder = useCallback(async () => {
    const opened = await openVisitRecorderApp();
    if (!opened) {
      Alert.alert(
        "Visit Recorder not installed",
        "Install Visit Recorder to record visits and share notes into your vault.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Install", onPress: openVisitRecorderPlayStore },
        ]
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoadingVitals(true);
      try {
        const docs = await vitalsService.getAllVitals(200);
        const summary = vitalRiskService.assessLatestVitals(docs as any);
        if (isMounted) setRisk(summary);
      } catch {
        if (isMounted) setRisk(null);
      } finally {
        if (isMounted) setLoadingVitals(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const urgentList = useMemo(() => {
    const list = risk?.assessments ?? [];
    return list.filter((a) => a.level === "red" || a.level === "yellow");
  }, [risk]);

  // Health score from risk numericScore (risk is higher = worse)
  const overallScore = useMemo(() => {
    const a = risk?.assessments ?? [];
    if (!a.length) return 0;
    const avgRisk = a.reduce((sum, x) => sum + (x.numericScore ?? 0), 0) / a.length;
    return clamp(100 - avgRisk);
  }, [risk]);

  const { scoreLabel, scoreSub } = useMemo(() => {
    if (!risk) return { scoreLabel: "No Score Yet", scoreSub: "Add a few readings to unlock your score." };

    let label = "Stable";
    let sub = "Keep it up.";
    if (overallScore < 30) {
      label = "High Risk";
      sub = "Let’s get you back to stable.";
    } else if (overallScore < 60) {
      label = "Needs Attention";
      sub = "Small changes can make a big impact.";
    } else if (overallScore < 80) {
      label = "Improving";
      sub = "Heading in the right direction.";
    } else {
      label = "Optimized";
      sub = "Excellent control. Maintain your habits.";
    }
    return { scoreLabel: label, scoreSub: sub };
  }, [overallScore, risk]);

  const bannerText = useMemo(() => {
    if (!risk) return "No vitals yet — add a few readings to get started.";
    return risk.overallLevel === "red"
      ? "High Risk — Immediate attention recommended."
      : risk.overallLevel === "yellow"
      ? "Moderate Risk — Monitor trends and follow up."
      : "Low Risk — Vitals appear stable.";
  }, [risk]);

  const redCount = risk ? risk.assessments.filter((a) => a.level === "red").length : 0;
  const yellowCount = risk ? risk.assessments.filter((a) => a.level === "yellow").length : 0;
  const greenCount = risk ? risk.assessments.filter((a) => a.level === "green").length : 0;

  return (
    <ScreenContainer
      showHeader
      headerShowLogo
      headerHideTitleWhenLogo
      headerShowAvatar
      onPressAvatar={goPatientProfile}
      headerShowSettings
      onPressSettings={goPatientProfile}
      contentStyle={{ paddingTop: 0 }}
    >
      <View style={{ height: theme.spacing.md }} />

      {/* Chart CTA */}
      <TouchableOpacity activeOpacity={0.9} onPress={goChartSetup} style={styles.progressStrip}>
        <View style={styles.progressStripTopRow}>
          <Text style={styles.progressStripLabel}>
            {setupPct === 0 ? "Start your chart" : "Chart progress"}
          </Text>

          <View style={styles.progressStripRight}>
            <Text style={styles.progressStripPct}>{setupPct}%</Text>

            <View style={styles.progressStripCta}>
              <Feather name="edit-3" size={14} color="#FFFFFF" />
              <Text style={styles.progressStripCtaText}>
                {setupPct === 0 ? "Start" : "Continue"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressStripTrack}>
          <View style={[styles.progressStripFill, { width: `${setupPct}%` }]} />
        </View>
      </TouchableOpacity>

      {/* Ask AI (single entry point) */}
      <CopilotOverviewCard onPress={goAiChat} />

      {/* Health overview */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewTop}>
          <View style={styles.overviewLeft}>
            <Text style={styles.bannerLabel}>AI Health Overview</Text>
            <Text style={styles.bannerHeadline}>{bannerText}</Text>
            <Text style={styles.bannerSub}>{scoreSub}</Text>
          </View>

          <View style={styles.overviewRight}>
            <HealthScoreRing score={overallScore} size={90} />
            <Text style={styles.healthMiniLabel}>{scoreLabel}</Text>
          </View>
        </View>

        <View style={styles.hairline} />

        <View style={styles.statusRow}>
          <StatusPill label="High-risk" value={redCount} tone="red" />
          <StatusPill label="Watchlist" value={yellowCount} tone="yellow" />
          <StatusPill label="Stable" value={greenCount} tone="green" />

          <TouchableOpacity onPress={onGoToVitals} activeOpacity={0.85} style={styles.statusCta}>
            <Feather name="activity" size={16} color={theme.colors.brand} />
            <Text style={styles.statusCtaText}>Vitals</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Quick actions */}
      <SectionHeader title="Quick actions" />
      <Card style={styles.actionCard}>
        <View style={styles.quickRow}>
          <TouchableOpacity onPress={goPatientProfile} activeOpacity={0.85} style={styles.quickItem}>
            <Feather name="user" size={18} color={TEAL} />
            <Text style={styles.quickText}>Demographics</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goChartSetup} activeOpacity={0.85} style={styles.quickItem}>
            <Feather name="edit-3" size={18} color={TEAL} />
            <Text style={styles.quickText}>Chart</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onVisitRecorder} activeOpacity={0.85} style={styles.quickItem}>
            <Feather name="mic" size={18} color={TEAL} />
            <Text style={styles.quickText}>Visit Recorder</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onGoToVitals} activeOpacity={0.85} style={styles.quickItem}>
            <Feather name="activity" size={18} color={theme.colors.success ?? theme.colors.brand} />
            <Text style={styles.quickText}>Add vitals</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Urgent vitals */}
      <SectionHeader title="Urgent vitals" />

      {loadingVitals ? (
        <Text style={styles.loading}>Analyzing your latest vitals…</Text>
      ) : urgentList.length ? (
        <>
          {urgentList.slice(0, 2).map((u, idx) => (
            <UrgentVitalCard key={`${u.type ?? "v"}-${idx}`} item={u} onPress={onGoToVitals} />
          ))}
          {urgentList.length > 2 ? (
            <TouchableOpacity onPress={onGoToVitals} style={styles.moreLink} activeOpacity={0.85}>
              <Text style={styles.moreLinkText}>View all vitals</Text>
              <Feather name="chevron-right" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <TouchableOpacity onPress={onGoToVitals} activeOpacity={0.85} style={styles.emptyRow}>
            <View style={styles.emptyIcon}>
              <Feather name="check-circle" size={18} color={theme.colors.success ?? theme.colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>No urgent vitals</Text>
              <Text style={styles.emptySub}>Everything looks stable right now.</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Card>
      )}

      {/* Check-in */}
      <SectionHeader title="Check-in" />
      <Text style={styles.sectionSubtitle}>
        Generate a PDF for your visit or a QR code for the clinic to scan.
      </Text>

      <Card style={styles.checkinCard}>
        <Button label="Start check-in" variant="secondary" onPress={onCheckIn} />
      </Card>

      <View style={{ height: theme.spacing.xl }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressStrip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: PROGRESS_BLUE,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    marginBottom: theme.spacing.sm,
  },
  progressStripTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressStripLabel: { fontSize: 12, fontWeight: "900", color: "#FFFFFF" },
  progressStripRight: { alignItems: "flex-end", gap: 6 },
  progressStripPct: { fontSize: 12, fontWeight: "900", color: "rgba(255,255,255,0.90)" },
  progressStripCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  progressStripCtaText: { fontSize: 12, fontWeight: "900", color: "#FFFFFF" },
  progressStripTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
    marginTop: 10,
  },
  progressStripFill: { height: 6, borderRadius: 6, backgroundColor: "#FFFFFF" },

  copilotCard: { marginBottom: theme.spacing.sm, paddingVertical: 12 },
  copilotRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  copilotLeft: { width: 96, alignItems: "center", justifyContent: "center" },
  copilotIconWrap: { width: 66, height: 66, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  copilotIcon: { width: 62, height: 62 },
  askAiText: { marginTop: 1, fontSize: 13, fontWeight: "800", color: theme.colors.text },
  copilotTitle: { fontSize: 15, fontWeight: "900", color: theme.colors.text, marginBottom: 2 },
  copilotSub: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, lineHeight: 16, maxWidth: "92%" },

  overviewCard: {},
  overviewTop: { flexDirection: "row", alignItems: "center" },
  overviewLeft: { flex: 1, paddingRight: theme.spacing.md },
  overviewRight: { alignItems: "center", justifyContent: "center" },

  bannerLabel: { fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary, marginBottom: 4 },
  bannerHeadline: { fontSize: 14, fontWeight: "900", color: theme.colors.text, marginBottom: 4 },
  bannerSub: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, lineHeight: 16 },

  hairline: { height: 1, backgroundColor: theme.colors.borderLight, marginVertical: theme.spacing.md },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  statusLabel: { fontSize: 11, fontWeight: "900", color: theme.colors.textSecondary, marginBottom: 4 },
  statusValue: { fontSize: 16, fontWeight: "900" },
  statusCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.brandTint,
  },
  statusCtaText: { fontSize: 12, fontWeight: "900", color: theme.colors.text },

  healthMiniLabel: { marginTop: 6, fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary },

  ringCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  ringScoreText: { fontSize: 18, fontWeight: "900", color: theme.colors.text },
  ringScoreLabel: { fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary },

  actionCard: { paddingVertical: theme.spacing.sm },
  quickRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  quickItem: { width: "48%", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, backgroundColor: theme.colors.surface, flexDirection: "row", alignItems: "center", gap: 10 },
  quickText: { fontSize: 12, fontWeight: "900", color: theme.colors.text },

  urgentCard: { paddingVertical: theme.spacing.sm, marginBottom: theme.spacing.sm },
  urgentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  urgentIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  urgentTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.text },
  urgentSub: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, marginTop: 2, lineHeight: 16 },
  moreLink: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginBottom: theme.spacing.md },
  moreLinkText: { fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary },

  emptyCard: { paddingVertical: theme.spacing.sm },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emptyIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.brandTint },
  emptyTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.text },
  emptySub: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, marginTop: 2 },

  loading: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm, color: theme.colors.textSecondary, fontSize: 12 },

  sectionSubtitle: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: theme.spacing.sm },
  checkinCard: { paddingVertical: theme.spacing.md },
});
