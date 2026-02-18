// src/features/patient/screens/DashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
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
import type {
  PatientVitalsRiskSummary,
  VitalRiskAssessment,
} from "../../vitals/types";

const TEAL = "#0B8E8E";
const PROGRESS_BLUE = "#1D4ED8";
const WEB_PORTAL_URL = "https://myhealthvaultai.com/app";

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

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

async function openWebPortal() {
  try {
    const can = await Linking.canOpenURL(WEB_PORTAL_URL);
    if (!can) {
      Alert.alert(
        "Cannot open web portal",
        "Your device can’t open this link right now."
      );
      return;
    }
    await Linking.openURL(WEB_PORTAL_URL);
  } catch {
    Alert.alert(
      "Cannot open web portal",
      "Your device can’t open this link right now."
    );
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
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.urgentRow}
      >
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

        <Feather
          name="chevron-right"
          size={18}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
    </Card>
  );
}

function FeatureRow({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  rightText,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightText?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.featureRow}>
      <View style={[styles.featureIconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color="#0F172A" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.featureSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.featureRight}>
        {rightText ? <Text style={styles.featureRightText}>{rightText}</Text> : null}
        <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
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

  const goAiChat = useCallback(() => {
    navigation.navigate(MainRoutes.AI_HOME_TAB as any, { screen: MainRoutes.AI_CHAT });
  }, [navigation]);

  const goChartSetup = useCallback(() => {
    navigation.navigate(MainRoutes.AI_HOME_TAB as any, {
      screen: MainRoutes.CHART_SETUP_INTRO,
    });
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
        "Install Visit Recorder to record visits and unlock AI summaries for your vault.",
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

  const progressLabel = setupPct === 0 ? "Start your chart" : "Chart progress";
  const progressAction = setupPct === 0 ? "Start" : "Continue";

  return (
    <ScreenContainer
      showHeader
      headerShowLogo
      headerHideTitleWhenLogo
      headerShowAvatar
      onPressAvatar={goPatientProfile}
      contentStyle={{ paddingTop: 0 }}
    >
      <View style={{ height: theme.spacing.sm }} />

      {/* Top Welcome / Chart Progress (smaller + no clipping) */}
      <TouchableOpacity activeOpacity={0.9} onPress={goChartSetup} style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            </View>

          {/* Inside-the-card badge (no clipping) */}
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>{setupPct}%</Text>
          </View>
        </View>

        <View style={styles.progressMidRow}>
          <Text style={styles.progressLabel}>{progressLabel}</Text>

          <View style={styles.progressCta}>
            <Feather name="edit-3" size={14} color="#FFFFFF" />
            <Text style={styles.progressCtaText}>{progressAction}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${setupPct}%` }]} />
        </View>
      </TouchableOpacity>

      {/* Feature Stack */}
      <Card style={styles.featureStackCard}>
        <FeatureRow
          icon="cpu"
          iconBg="rgba(29, 78, 216, 0.10)"
          title="OpenAI Copilot"
          subtitle="Ask questions, prep for visits, and understand your health."
          onPress={goAiChat}
        />
        <View style={styles.rowDivider} />
        <FeatureRow
          icon="mic"
          iconBg="rgba(11, 142, 142, 0.14)"
          title="Visit Recorder"
          subtitle="Record visits + get AI summaries (with changes noted)."
          onPress={onVisitRecorder}
          rightText="Open"
        />
        <View style={styles.rowDivider} />
        <FeatureRow
          icon="globe"
          iconBg="rgba(15, 23, 42, 0.06)"
          title="Web Portal"
          subtitle="Open your vault on desktop for easier viewing and uploads."
          onPress={openWebPortal}
        />
      </Card>

      {/* Health overview */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewTop}>
          <View style={styles.overviewLeft}>
            <Text style={styles.bannerLabel}>AI Health Overview</Text>
            <Text style={styles.bannerHeadline}>{bannerText}</Text>
            <Text style={styles.bannerSub}>{scoreSub}</Text>
          </View>

          <View style={styles.overviewRight}>
            <HealthScoreRing score={overallScore} size={86} />
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

      {/* Quick actions (BACK IN A CARD) */}
      <SectionHeader title="Quick actions" />
      <Card style={styles.quickCard}>
        <View style={styles.quickGrid}>
          <TouchableOpacity onPress={goPatientProfile} activeOpacity={0.88} style={styles.quickTile}>
            <View style={styles.quickIconCircle}>
              <Feather name="user" size={18} color={TEAL} />
            </View>
            <Text style={styles.quickText} numberOfLines={1}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goChartSetup} activeOpacity={0.88} style={styles.quickTile}>
            <View style={styles.quickIconCircle}>
              <Feather name="edit-3" size={18} color={TEAL} />
            </View>
            <Text style={styles.quickText} numberOfLines={1}>Chart</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onVisitRecorder} activeOpacity={0.88} style={styles.quickTile}>
            <View style={styles.quickIconCircle}>
              <Feather name="mic" size={18} color={TEAL} />
            </View>
            <Text style={styles.quickText} numberOfLines={1}>Recorder</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onGoToVitals} activeOpacity={0.88} style={styles.quickTile}>
            <View style={styles.quickIconCircle}>
              <Feather
                name="activity"
                size={18}
                color={theme.colors.success ?? theme.colors.brand}
              />
            </View>
            <Text style={styles.quickText} numberOfLines={1}>Vitals</Text>
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
              <Feather
                name="check-circle"
                size={18}
                color={theme.colors.success ?? theme.colors.brand}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>No urgent vitals</Text>
              <Text style={styles.emptySub}>Everything looks stable right now.</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Card>
      )}

      {/* Check-in (more personality) */}
      <SectionHeader title="Check-in" />
      <Text style={styles.sectionSubtitle}>
        Generate a PDF for your visit or a QR code for the clinic to scan.
      </Text>

      <Card style={styles.checkinCard}>
        <View style={styles.checkinTopRow}>
          <View style={styles.checkinIcon}>
            <Feather name="clipboard" size={18} color={PROGRESS_BLUE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkinTitle}>Ready for your appointment?</Text>
            <Text style={styles.checkinSub} numberOfLines={2}>
              Create a clean, clinic-ready check-in packet in seconds.
            </Text>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <Button label="Start check-in" onPress={onCheckIn} />
      </Card>

      <View style={{ height: theme.spacing.xl }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /* Top card */
  progressCard: {
    marginHorizontal: theme.spacing.md,
    borderRadius: 18,
    backgroundColor: "rgba(29, 78, 216, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.12)",
    padding: 14,
    marginBottom: theme.spacing.md,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  progressPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PROGRESS_BLUE,
    minWidth: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  progressPillText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  progressMidRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
  },
  progressCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PROGRESS_BLUE,
  },
  progressCtaText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  progressTrack: {
    marginTop: 12,
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PROGRESS_BLUE,
  },

  /* Feature stack */
  featureStackCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingVertical: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  featureRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureRightText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.brand,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight ?? "rgba(15, 23, 42, 0.08)",
    marginHorizontal: 12,
  },

  /* Overview */
  overviewCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  overviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  overviewLeft: { flex: 1 },
  overviewRight: { alignItems: "center" },

  bannerLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  bannerHeadline: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  bannerSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  ringCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  ringScoreText: { fontSize: 20, fontWeight: "900", color: theme.colors.text },
  ringScoreLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textSecondary,
  },
  healthMiniLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
  },

  hairline: {
    height: 1,
    backgroundColor: theme.colors.borderLight ?? "rgba(15, 23, 42, 0.08)",
    marginVertical: theme.spacing.md,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    minWidth: 90,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.textSecondary,
  },
  statusValue: { marginTop: 4, fontSize: 18, fontWeight: "900" },

  statusCta: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  statusCtaText: { fontSize: 12, fontWeight: "900", color: theme.colors.brand },

  /* Quick actions */
  quickCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingVertical: 14,
  },
  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  quickTile: { width: "23%", alignItems: "center" },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 8,
  },
  quickText: {
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  /* Urgent vitals */
  urgentCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  urgentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  urgentIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  urgentTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.text },
  urgentSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  loading: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },

  moreLink: {
    marginHorizontal: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    marginBottom: theme.spacing.md,
  },
  moreLinkText: { fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary },

  emptyCard: { marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.10)",
  },
  emptyTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.text },
  emptySub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  /* Check-in */
  sectionSubtitle: {
    marginHorizontal: theme.spacing.md,
    marginTop: 6,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    lineHeight: 18,
  },
  checkinCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingVertical: 16,
  },
  checkinTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  checkinIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(29, 78, 216, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.12)",
  },
  checkinTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 2,
  },
  checkinSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});
