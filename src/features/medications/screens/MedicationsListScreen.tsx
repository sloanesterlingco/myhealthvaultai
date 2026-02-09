// src/features/medications/screens/MedicationsListScreen.tsx
//
// Polished V1 Medications list screen (REAL DATA + Active/Inactive toggle)
// - Loads meds from patientService via useMedicationsList
// - Refreshes on screen focus
// - Shows Active meds by default
// - Toggle: Show inactive
//
// NOTE: This screen is UI-only; it does NOT give medication advice.

import React, { useMemo, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";
import { useMedicationsList } from "../hooks/useMedicationsList";

// Keep this flexible: patientService is JS and returns "any" shapes.
// We'll render common fields safely.
type AnyMedication = {
  id?: string;
  name?: string;

  // common variants
  dose?: string;
  dosage?: string;

  frequency?: string;

  // active/inactive variants
  status?: string; // "active" | "inactive"
  isActive?: boolean;
  active?: boolean;

  // stop date variants
  stoppedAt?: string;
  endDate?: string;

  updatedAt?: number;
  createdAt?: number;
};

function formatLastUpdated(ts: number | null) {
  if (!ts) return "Not updated yet";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins <= 0) return "Updated just now";
  if (mins === 1) return "Updated 1 minute ago";
  if (mins < 60) return `Updated ${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "Updated 1 hour ago";
  if (hrs < 24) return `Updated ${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Updated 1 day ago";
  return `Updated ${days} days ago`;
}

function isMedicationInactive(m: AnyMedication): boolean {
  if (!m) return false;

  // Explicit inactive flags
  if (typeof m.status === "string" && m.status.toLowerCase() === "inactive") return true;
  if (typeof m.isActive === "boolean" && m.isActive === false) return true;
  if (typeof m.active === "boolean" && m.active === false) return true;

  // If there's an end/stop date, treat as inactive for list purposes
  if (typeof m.stoppedAt === "string" && m.stoppedAt.trim().length > 0) return true;
  if (typeof m.endDate === "string" && m.endDate.trim().length > 0) return true;

  return false;
}

function getDoseText(m: AnyMedication) {
  return (m?.dosage ?? m?.dose ?? "").toString().trim();
}

export default function MedicationsListScreen() {
  const navigation = useNavigation<any>();
  const { medications, loadMedications } = useMedicationsList();

  const [showInactive, setShowInactive] = useState(false);

  // Track a user-triggered refresh timestamp
  const lastUpdatedRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    await loadMedications();
    lastUpdatedRef.current = Date.now();
  }, [loadMedications]);

  // Refresh when the screen is focused (so edits appear immediately)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const lastUpdatedText = useMemo(() => {
    if (lastUpdatedRef.current) return formatLastUpdated(lastUpdatedRef.current);
    if (medications && medications.length > 0) return "Medication list loaded";
    return "No medications yet";
  }, [medications]);

  const { activeMeds, inactiveMeds, visibleMeds } = useMemo(() => {
    const list = (Array.isArray(medications) ? medications : []) as AnyMedication[];

    const inactive = list.filter((m) => isMedicationInactive(m));
    const active = list.filter((m) => !isMedicationInactive(m));

    return {
      activeMeds: active,
      inactiveMeds: inactive,
      visibleMeds: showInactive ? list : active,
    };
  }, [medications, showInactive]);

  const status = useMemo(() => {
    if (!medications || medications.length === 0) {
      return {
        label: "No medications",
        sub: "Add or scan a label to build your list for safer care.",
        tone: "neutral" as const,
      };
    }

    if (activeMeds.length === 0 && inactiveMeds.length > 0) {
      return {
        label: "All inactive",
        sub: "You have medications saved, but none are currently active.",
        tone: "neutral" as const,
      };
    }

    return {
      label: "List ready",
      sub: "Keep this updated so clinicians can act fast and safely.",
      tone: "good" as const,
    };
  }, [medications, activeMeds.length, inactiveMeds.length]);

  const pillStyle = status.tone === "good" ? styles.pillGood : styles.pillNeutral;
  const dotStyle = status.tone === "good" ? styles.dotGood : styles.dotNeutral;

  const goToScan = () => navigation.navigate(MainRoutes.MEDICATION_OCR_IMPORT);
  const goToAddManual = () => navigation.navigate(MainRoutes.ADD_MEDICATION);

  const goToDetail = (m: AnyMedication) =>
    navigation.navigate(MainRoutes.MEDICATION_DETAIL, { medication: m } as any);

  const sectionCount = showInactive ? medications?.length ?? 0 : activeMeds.length;

  return (
    <ScreenContainer
      showHeader={true}
      title="Medications"
      headerShowLogo={false}
      headerShowAvatar={true}
      onPressAvatar={() =>
        navigation.navigate(MainRoutes.DASHBOARD_TAB, {
          screen: MainRoutes.PROFILE_SETTINGS,
        })
      }
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      {/* ✅ Prestige meta row (small, not redundant) */}
      <View style={styles.metaRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaTitle}>Medication overview</Text>
          <Text style={styles.metaSub}>{lastUpdatedText}</Text>
        </View>

        {/* Optional small “manage” icon button */}
        <TouchableOpacity onPress={() => {}} activeOpacity={0.85} style={styles.iconPill}>
          <Feather name="shield" size={16} color={theme.colors.text} />
          <Text style={styles.iconPillText}>Safety</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Status summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryKicker}>Medication list status</Text>

            <View style={[styles.statusPill, pillStyle]}>
              <View style={[styles.statusDot, dotStyle]} />
              <Text style={styles.statusText}>{status.label}</Text>
            </View>

            <Text style={styles.summarySub}>{status.sub}</Text>
          </View>

          <View style={styles.summaryIcon}>
            <Feather name="package" size={20} color={theme.colors.brand} />
          </View>
        </View>

        <View style={{ height: theme.spacing.md }} />

        {/* Primary actions */}
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Button label="Scan label" onPress={goToScan} style={styles.btnBrand} />
          </View>

          <View style={{ width: theme.spacing.sm }} />

          <View style={{ flex: 1 }}>
            <Button label="Add manually" onPress={goToAddManual} />
          </View>
        </View>

        <Text style={styles.helperLine}>
          Tip: scanning is fastest; manual add is best for corrections.
        </Text>
      </Card>

      {/* ✅ Section header + Show inactive toggle */}
      <View style={styles.sectionRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.sectionTitle}>Your medications</Text>
          <Text style={styles.sectionCount}>{`${sectionCount}`}</Text>
        </View>

        <View style={styles.toggleWrap}>
          <Text style={styles.toggleText}>Show inactive</Text>
          <Switch value={showInactive} onValueChange={setShowInactive} />
        </View>
      </View>

      {/* Empty state */}
      {!medications || medications.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyRow}>
            <View style={styles.emptyIcon}>
              <Feather name="info" size={18} color={theme.colors.brand} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>No medications added yet</Text>
              <Text style={styles.emptySub}>
                Add one to start building a clean list you can share at visits.
              </Text>
            </View>
          </View>

          <View style={{ height: theme.spacing.md }} />

          <Button label="Add first medication" onPress={goToAddManual} />
          <TouchableOpacity onPress={goToScan} activeOpacity={0.85} style={styles.secondaryLink}>
            <Text style={styles.secondaryLinkText}>Or scan a label</Text>
            <Feather name="chevron-right" size={16} color={theme.colors.brand} />
          </TouchableOpacity>
        </Card>
      ) : visibleMeds.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyRow}>
            <View style={styles.emptyIcon}>
              <Feather name="check-circle" size={18} color={theme.colors.brand} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>No active medications</Text>
              <Text style={styles.emptySub}>
                Your active list is empty. Turn on “Show inactive” to view your history.
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <View style={{ marginTop: theme.spacing.sm }}>
          {visibleMeds.map((m) => {
            const inactive = isMedicationInactive(m);
            const doseText = getDoseText(m);
            const freqText = (m?.frequency ?? "").toString().trim();

            return (
              <TouchableOpacity
                key={m.id ?? `${m.name}-${Math.random()}`}
                activeOpacity={0.85}
                onPress={() => goToDetail(m)}
              >
                <Card style={styles.medRowCard}>
                  <View style={styles.medRow}>
                    <View style={styles.medIcon}>
                      <Feather name="package" size={18} color={theme.colors.brand} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.medName}>{m.name || "Unnamed medication"}</Text>

                        {inactive ? (
                          <View style={styles.inactivePill}>
                            <Text style={styles.inactivePillText}>Inactive</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.medMeta}>
                        {[doseText, freqText].filter(Boolean).join(" • ") || "—"}
                      </Text>
                    </View>

                    <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  metaTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  metaSub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },

  iconPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  iconPillText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: 0.2,
  },

  // Summary card
  summaryCard: {
    marginBottom: theme.spacing.md,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryKicker: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  summarySub: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(59, 130, 246, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.12)",
  },

  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillGood: {
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    borderColor: "rgba(34, 197, 94, 0.20)",
  },
  pillNeutral: {
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  dotGood: { backgroundColor: "#22C55E" },
  dotNeutral: { backgroundColor: "rgba(15, 23, 42, 0.35)" },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  helperLine: {
    marginTop: theme.spacing.md,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },

  btnBrand: { backgroundColor: theme.colors.brand },

  // Section header
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.xs ?? 0,
    marginBottom: theme.spacing.sm,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },

  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
  },

  inactivePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
  },
  inactivePillText: {
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.textSecondary,
  },

  // Empty state
  emptyCard: {
    marginTop: theme.spacing.sm,
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  emptySub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  secondaryLink: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  secondaryLinkText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.brand,
  },

  // Medication row card
  medRowCard: {
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  medIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  medName: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  medMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
});
