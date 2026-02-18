// src/features/medicalTimeline/screens/MedicalTimelineScreen.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import ScreenContainer from "../../../ui/ScreenContainer";
import { theme } from "../../../theme";

import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";
import { timelineService } from "../services/timelineService";
import type { TimelineCategory, TimelineEvent } from "../services/timelineTypes";
import { Card } from "../../../ui/Card";

// ✅ Pull existing structured data so Timeline always reflects reality
import { patientService, Medication } from "../../../services/patientService";
import { vitalsService } from "../../vitals/services/vitalsService";
import type { VitalDoc } from "../../vitals/services/vitalsService";

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
  } catch {}
}

function VisitRecorderCtaCard({ onPress }: { onPress: () => void }) {
  return (
    <Card style={styles.vrCard}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.vrRow}
      >
        <View style={styles.vrIconWrap}>
          <Feather name="mic" size={18} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.vrTitle}>Unlock Visit Recorder</Text>
          <Text style={styles.vrSub}>
            Record appointments + generate AI summaries (with changes noted).
            Download Visit Recorder and create your account to fully power your
            timeline.
          </Text>
        </View>

        <View style={styles.vrCta}>
          <Text style={styles.vrCtaText}>Open</Text>
          <Feather name="chevron-right" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </Card>
  );
}

/* -------------------- Tabs -------------------- */

type TimelineNav = NativeStackNavigationProp<MainRoutesParamList>;
type TimelineTab = "all" | TimelineCategory;

function resolveCategory(ev: TimelineEvent): TimelineCategory {
  const explicit = (ev as any)?.category as TimelineCategory | undefined;
  if (explicit) return explicit;

  const type = String((ev as any)?.type ?? "").toUpperCase();
  const meta = ((ev as any)?.meta ?? {}) as Record<string, any>;
  const source = String(meta?.source ?? "").toLowerCase();

  if (type.includes("ALERT") || type.includes("SAFETY")) return "warnings";
  if (String((ev as any)?.level ?? "").toLowerCase() === "urgent")
    return "warnings";

  if (source.includes("vital")) return "vitals";
  if (source.includes("med")) return "medications";
  if (source.includes("record") || source.includes("ocr") || source.includes("upload"))
    return "records";
  if (source.includes("visit") || source.includes("checkin") || source.includes("pre_visit"))
    return "visits";
  if (source.includes("lab")) return "labs";
  if (source.includes("imaging") || source.includes("radiology"))
    return "imaging";
  if (source.includes("insurance")) return "insurance";
  if (source.includes("export")) return "exports";

  if (type.includes("VITAL")) return "vitals";
  if (type.includes("MED")) return "medications";
  if (type.includes("RECORD") || type.includes("OCR") || type.includes("UPLOAD"))
    return "records";
  if (type.includes("LAB")) return "labs";
  if (type.includes("IMAGING") || type.includes("CT") || type.includes("MRI"))
    return "imaging";
  if (type.includes("INSURANCE")) return "insurance";
  if (type.includes("EXPORT") || type.includes("PDF") || type.includes("QR"))
    return "exports";
  if (type.includes("VISIT") || type.includes("SUMMARY") || type.includes("CHECKIN"))
    return "visits";

  return "other";
}

const TAB_DEFS: Array<{ key: TimelineTab; label: string; icon: any }> = [
  { key: "all", label: "All", icon: "layers" },
  { key: "warnings", label: "Warnings", icon: "alert-triangle" },
  { key: "vitals", label: "Vitals", icon: "activity" },
  { key: "medications", label: "Meds", icon: "plus-square" },
  { key: "records", label: "Records", icon: "file-text" },
  { key: "labs", label: "Labs", icon: "droplet" },
  { key: "imaging", label: "Imaging", icon: "camera" },
  { key: "visits", label: "Visits", icon: "clipboard" },
  { key: "insurance", label: "Insurance", icon: "credit-card" },
  { key: "exports", label: "Exports", icon: "share" },
  { key: "other", label: "Other", icon: "inbox" },
];

function TabButton({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: any;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <View style={styles.tabInner}>
        <Feather
          name={icon}
          size={15}
          color={
            active
              ? theme.colors.brand
              : theme.colors.textSecondary ?? theme.colors.textMuted
          }
        />
        <Text
          style={[styles.tabLabel, active && styles.tabLabelActive]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      {active ? (
        <View style={styles.tabActiveBar} />
      ) : (
        <View style={styles.tabInactiveBar} />
      )}
    </Pressable>
  );
}

/* -------------------- Synthetic items (V1) -------------------- */

function trimOrEmpty(v: any): string {
  return String(v ?? "").trim();
}

function formatMedDetail(m: Medication): string {
  const parts: string[] = [];
  const dose = trimOrEmpty((m as any).dosage);
  const freq = trimOrEmpty((m as any).frequency);
  if (dose) parts.push(`Dosage: ${dose}`);
  if (freq) parts.push(`Frequency: ${freq}`);
  return parts.join(" • ");
}

function formatVitalSummary(v: VitalDoc): string {
  if (v.type === "bp") {
    const s = Number(v.systolic ?? 0);
    const d = Number(v.diastolic ?? 0);
    return `Blood Pressure: ${s}/${d}`;
  }
  const val = Number(v.value ?? 0);
  if (v.type === "hr") return `Heart Rate: ${val} bpm`;
  if (v.type === "spo2") return `SpO₂: ${val}%`;
  if (v.type === "rr") return `Respiratory Rate: ${val}`;
  if (v.type === "temp") return `Temperature: ${val}`;
  if (v.type === "weight") return `Weight: ${val}`;
  if (v.type === "height") return `Height: ${val}`;
  return `Vital: ${val}`;
}

/* -------------------- Screen -------------------- */

export default function MedicalTimelineScreen() {
  const navigation = useNavigation<TimelineNav>();

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [vitals, setVitals] = useState<VitalDoc[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tab, setTab] = useState<TimelineTab>("all");

  // Scroll indicator state
  const [trackW, setTrackW] = useState(1);
  const [thumbW, setThumbW] = useState(24);
  const [thumbX, setThumbX] = useState(0);
  const scrollMetaRef = useRef({ contentW: 1, viewW: 1, x: 0 });

  const loadAll = useCallback(async () => {
    const [tl, medList, vitalList] = await Promise.all([
      timelineService.getEvents(),
      patientService.listMedications().catch(() => []),
      vitalsService.getAllVitals(200).catch(() => []),
    ]);

    setTimelineEvents(Array.isArray(tl) ? tl : []);
    setMeds(Array.isArray(medList) ? (medList as Medication[]) : []);
    setVitals(Array.isArray(vitalList) ? (vitalList as VitalDoc[]) : []);
  }, []);

  const firstLoad = useCallback(async () => {
    try {
      setLoading(true);
      await loadAll();
    } finally {
      setLoading(false);
    }
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  useEffect(() => {
    firstLoad();
  }, [firstLoad]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      return () => {};
    }, [loadAll])
  );

  const onVisitRecorder = useCallback(async () => {
    const opened = await openVisitRecorderApp();
    if (!opened) {
      Alert.alert(
        "Visit Recorder not installed",
        "Install Visit Recorder to record visits and unlock AI summaries for your timeline.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Install", onPress: openVisitRecorderPlayStore },
        ]
      );
    }
  }, []);

  // Build synthetic events for meds/vitals so timeline reflects existing chart data.
  const mergedEvents = useMemo(() => {
    const tl = Array.isArray(timelineEvents) ? timelineEvents : [];
    const out: TimelineEvent[] = [...tl];

    // Dedupe sets based on existing timeline meta ids
    const hasMed = new Set<string>();
    const hasVital = new Set<string>();

    for (const e of tl) {
      const meta = (e as any)?.meta ?? {};
      if (meta?.medicationId) hasMed.add(String(meta.medicationId));
      if (meta?.vitalId) hasVital.add(String(meta.vitalId));
    }

    // Add medications as synthetic items if not already present
    for (const m of meds) {
      const medId = String((m as any)?.id ?? "");
      if (!medId || hasMed.has(medId)) continue;

      const name = trimOrEmpty((m as any)?.name);
      const ts =
        Number((m as any)?.updatedAtMs ?? (m as any)?.createdAtMs ?? Date.now()) ||
        Date.now();

      out.push({
        id: `synthetic-med-${medId}`,
        type: "MEDICATION_ADDED",
        category: "medications",
        summary: name ? `Medication: ${name}` : "Medication",
        detail: formatMedDetail(m) || "Added to your medication list.",
        timestamp: ts,
        date: undefined,
        level: "info" as any,
        meta: {
          source: "medications",
          medicationId: medId,
          synthetic: true,
        },
      } as any);
    }

    // Add vitals as synthetic items if not already present
    for (const v of vitals) {
      const vitalId = String((v as any)?.id ?? "");
      if (!vitalId || hasVital.has(vitalId)) continue;

      const ts = Number((v as any)?.timestampMs ?? Date.now()) || Date.now();

      out.push({
        id: `synthetic-vital-${vitalId}`,
        type: "VITAL",
        category: "vitals",
        summary: formatVitalSummary(v),
        detail: trimOrEmpty((v as any)?.notes) || "Recorded in your vitals history.",
        timestamp: ts,
        date: undefined,
        level: "info" as any,
        meta: {
          source: "vitals",
          vitalId,
          vitalType: (v as any)?.type,
          synthetic: true,
        },
      } as any);
    }

    // Sort newest first
    out.sort((a, b) => Number((b as any)?.timestamp ?? 0) - Number((a as any)?.timestamp ?? 0));
    return out;
  }, [timelineEvents, meds, vitals]);

  const filteredEvents = useMemo(() => {
    if (tab === "all") return mergedEvents;
    return mergedEvents.filter((e) => resolveCategory(e) === tab);
  }, [mergedEvents, tab]);

  const renderItem = ({ item }: { item: TimelineEvent }) => {
    return (
      <TouchableOpacity
        style={styles.eventContainer}
        onPress={() =>
          navigation.navigate(MainRoutes.TIMELINE_EVENT_DETAIL, { event: item })
        }
        activeOpacity={0.85}
      >
        <Text style={styles.eventType}>{String(item.type)}</Text>
        <Text style={styles.eventTitle}>{item.summary}</Text>
        {!!item.detail ? (
          <Text style={styles.eventDetail}>{item.detail}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  // --- Scroll indicator handlers ---
  const updateThumb = useCallback(() => {
    const { contentW, viewW, x } = scrollMetaRef.current;
    const scrollable = Math.max(1, contentW - viewW);

    const ratio = Math.min(1, viewW / Math.max(1, contentW));
    const newThumbW = Math.max(24, Math.floor(trackW * ratio));
    setThumbW(newThumbW);

    const progress = Math.max(0, Math.min(1, x / scrollable));
    const maxX = Math.max(0, trackW - newThumbW);
    setThumbX(progress * maxX);
  }, [trackW]);

  const onTabsContentSizeChange = useCallback(
    (w: number) => {
      scrollMetaRef.current.contentW = w;
      updateThumb();
    },
    [updateThumb]
  );

  const onTabsScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollMetaRef.current.x = e.nativeEvent.contentOffset.x;
      updateThumb();
    },
    [updateThumb]
  );

  const onTabsContainerLayout = useCallback(
    (e: any) => {
      const w = e.nativeEvent.layout.width;
      scrollMetaRef.current.viewW = w;
      updateThumb();
    },
    [updateThumb]
  );

  return (
    <ScreenContainer
      showHeader
      title="Medical Timeline"
      scroll={false}
      contentStyle={{ padding: 0 }}
    >
      {/* Top actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={firstLoad}
          disabled={loading}
          style={[styles.iconBtn, loading && { opacity: 0.5 }]}
          activeOpacity={0.85}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="refresh-cw" size={18} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={() => navigation.navigate(MainRoutes.ADD_TIMELINE_EVENT)}
          style={styles.addChip}
          activeOpacity={0.85}
        >
          <Text style={styles.addChipText}>Add to Chart</Text>
          <View style={{ width: 8 }} />
          <View style={styles.addChipIcon}>
            <Feather name="plus" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Tabs + scroll indicator */}
      <View style={styles.tabsWrap} onLayout={onTabsContainerLayout}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: "100%" }}
          contentContainerStyle={styles.tabsBar}
          onContentSizeChange={onTabsContentSizeChange}
          onScroll={onTabsScroll}
          scrollEventThrottle={16}
        >
          {TAB_DEFS.map((t) => (
            <TabButton
              key={String(t.key)}
              active={tab === t.key}
              label={t.label}
              icon={t.icon}
              onPress={() => setTab(t.key)}
            />
          ))}
        </ScrollView>

        <View
          style={styles.scrollTrack}
          onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
        >
          <View style={[styles.scrollThumb, { width: thumbW, left: thumbX }]} />
        </View>
      </View>

      <View style={styles.ctaWrap}>
        <VisitRecorderCtaCard onPress={onVisitRecorder} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyTop}>
              <Text style={styles.emptyTitle}>No items in this section</Text>
              <Text style={styles.emptySub}>
                Add to your chart or switch categories above.
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },

  addChip: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },
  addChipText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.text,
  },
  addChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.brand,
  },

  tabsWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },

  tabsBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingRight: 24,
    paddingBottom: 8,
  },

  tabBtn: {
    minHeight: 46,
    minWidth: 68,
    marginRight: 10,
  },
  tabInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    marginTop: 5,
  },
  tabLabelActive: {
    color: theme.colors.brand,
    fontWeight: "900",
  },
  tabActiveBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.brand,
  },
  tabInactiveBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
  },

  scrollTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.10)",
    overflow: "hidden",
  },
  scrollThumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },

  ctaWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },

  vrCard: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight ?? "#ddd",
  },
  vrRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  vrIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.brand,
    marginRight: 12,
  },
  vrTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 2,
  },
  vrSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    lineHeight: 16,
  },
  vrCta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.brand,
    marginLeft: 12,
  },
  vrCtaText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    marginRight: 4,
  },

  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingTop: 6,
  },

  eventContainer: {
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight ?? "#ddd",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  eventType: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  eventDetail: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    lineHeight: 16,
  },

  emptyTop: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    lineHeight: 16,
  },
});
