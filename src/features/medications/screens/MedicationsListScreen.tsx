// src/features/medications/screens/MedicationsListScreen.tsx

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { SectionHeader } from "../../../ui/SectionHeader";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";
import { patientService, Medication } from "../../../services/patientService";

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

function trimOrEmpty(v: any): string {
  return String(v ?? "").trim();
}

function formatMedSubtitle(m: Medication) {
  const parts: string[] = [];
  const dose = trimOrEmpty((m as any).dosage);
  const freq = trimOrEmpty((m as any).frequency);
  if (dose) parts.push(dose);
  if (freq) parts.push(freq);
  return parts.join(" • ");
}

function formatMedMeta(m: Medication) {
  const parts: string[] = [];
  const pharmacy = trimOrEmpty((m as any).pharmacy);
  const rxNumber = trimOrEmpty((m as any).rxNumber);
  if (pharmacy) parts.push(pharmacy);
  if (rxNumber) parts.push(`Rx ${rxNumber}`);
  return parts.join(" • ");
}

export default function MedicationsListScreen() {
  const navigation = useNavigation<any>();

  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const meds = await patientService.listMedications();
      setItems(Array.isArray(meds) ? meds : []);
    } catch (e: any) {
      console.log("List medications error:", e);
      Alert.alert("Could not load medications", e?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onVisitRecorder = useCallback(async () => {
    const opened = await openVisitRecorderApp();
    if (!opened) {
      Alert.alert(
        "Visit Recorder not installed",
        "Install Visit Recorder to record visits and automatically update your medication list.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Install", onPress: openVisitRecorderPlayStore },
        ]
      );
    }
  }, []);

  const goAddMedication = useCallback(() => {
    navigation.navigate(MainRoutes.ADD_MEDICATION);
  }, [navigation]);

  const goScanMedication = useCallback(() => {
    navigation.navigate(MainRoutes.MEDICATION_OCR_IMPORT);
  }, [navigation]);

  const openMedication = useCallback(
    (med: Medication) => {
      if (!med?.id) return;

      // ✅ Open your existing MedicationDetailScreen
      navigation.navigate(MainRoutes.MEDICATION_DETAIL, { id: med.id });
      // If your detail screen expects "medicationId" instead, use:
      // navigation.navigate(MainRoutes.MEDICATION_DETAIL, { medicationId: med.id });
    },
    [navigation]
  );

  return (
    <ScreenContainer
      showHeader
      headerShowLogo
      headerHideTitleWhenLogo
      headerShowAvatar
    >
      <View style={{ height: theme.spacing.md }} />

      {/* Visit Recorder CTA */}
      <Card style={styles.vrCard}>
        <TouchableOpacity
          onPress={onVisitRecorder}
          activeOpacity={0.9}
          style={styles.vrRow}
        >
          <View style={styles.vrIconWrap}>
            <Feather name="mic" size={18} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.vrTitle}>Record Your Visits Automatically</Text>
            <Text style={styles.vrSub}>
              Download Visit Recorder to capture appointments and sync AI summaries
              directly into your medication history.
            </Text>
          </View>

          <View style={styles.vrCtaPill}>
            <Text style={styles.vrCtaText}>Open</Text>
            <Feather name="chevron-right" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </Card>

      <SectionHeader title="Your Medications" />
      <Text style={{ fontSize: 10, opacity: 0.6 }}>MedsList vNext</Text>

      {/* Actions */}
      <Card style={styles.actionCard}>
        <Button label="Add medication manually" onPress={goAddMedication} />
        <View style={{ height: theme.spacing.sm }} />
        <Button
          label="Scan medication label"
          variant="secondary"
          onPress={goScanMedication}
        />
      </Card>

      <View style={{ height: theme.spacing.md }} />

      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator />
          <View style={{ height: theme.spacing.sm }} />
          <Text style={styles.loadingText}>Loading medications…</Text>
        </Card>
      ) : items.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No medications added yet</Text>
          <Text style={styles.emptySub}>
            Add medications manually or scan your prescription label.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {items.map((m) => {
            const title = trimOrEmpty(m.name) || "Medication";
            const subtitle = formatMedSubtitle(m);
            const meta = formatMedMeta(m);

            return (
              <Card key={m.id ?? `${title}-${Math.random()}`} style={styles.medCard}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => openMedication(m)}
                  style={styles.medRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medTitle}>{title}</Text>
                    {subtitle ? <Text style={styles.medSub}>{subtitle}</Text> : null}
                    {meta ? <Text style={styles.medMeta}>{meta}</Text> : null}
                  </View>

                  <Feather
                    name="chevron-right"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </Card>
            );
          })}
        </View>
      )}

      <View style={{ height: theme.spacing.xl }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  vrCard: {
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  vrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  vrIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.brand,
  },
  vrTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  vrSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  vrCtaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.brand,
  },
  vrCtaText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  actionCard: {
    paddingVertical: theme.spacing.md,
  },

  emptyCard: {
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  loadingCard: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },

  medCard: {
    paddingVertical: theme.spacing.sm,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  medTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  medSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textSecondary,
  },
  medMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    opacity: 0.9,
  },
});
