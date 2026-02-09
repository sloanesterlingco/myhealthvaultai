import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";
import { useNavigation } from "@react-navigation/native";

import { patientAggregationService } from "../services/patientAggregationService";

function listify(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  return [];
}

export default function ChartSetupReviewScreen() {
  const navigation = useNavigation<any>();

  const patient: any = patientAggregationService.getPatient?.() ?? {};

  const sections = useMemo(() => {
    // ✅ Use the real model fields
    const pmh =
  (patient?.conditions ?? [])
    .map((c: any) => (typeof c === "string" ? c : c?.name))
    .filter(Boolean);

    const psh =
  (patient?.surgeries ?? [])
    .map((s: any) => (typeof s === "string" ? s : s?.procedure))
    .filter(Boolean);

    const fam =
      (patient?.familyHistory ?? []).map((f: any) => {
        const rel = String(f?.relation ?? "").trim();
        const cond = String(f?.condition ?? "").trim();
        return [rel, cond].filter(Boolean).join(": ");
      }).filter(Boolean);

    const social =
      patient?.socialHistory && typeof patient.socialHistory === "object"
        ? Object.entries(patient.socialHistory)
            .map(([k, v]) => {
              const val = typeof v === "string" ? v.trim() : JSON.stringify(v);
              return val ? `${k}: ${val}` : "";
            })
            .filter(Boolean)
        : listify(patient?.socialHistory);

    const allergies =
  (patient?.allergies ?? [])
    .map((a: any) => (typeof a === "string" ? a : a?.substance ?? a?.name))
    .filter(Boolean);

    const meds =
  (patient?.medications ?? [])
    .map((m: any) => (typeof m === "string" ? m : m?.name))
    .filter(Boolean);

    return [
      { title: "Past Medical History", data: pmh },
      { title: "Past Surgical History", data: psh },
      { title: "Family History", data: fam },
      { title: "Social History", data: social },
      { title: "Allergies", data: allergies },
      { title: "Medications", data: meds },
    ];
  }, [patient]);

  const onConfirm = async () => {
    try {
      patientAggregationService.setChartSetupProgress?.({
        status: "complete",
        phase: "complete",
        completedAt: new Date().toISOString(),
      });
      await patientAggregationService.persistToFirestore?.();
    } catch {}

    navigation.navigate(MainRoutes.DASHBOARD_TAB, {
      screen: MainRoutes.DASHBOARD,
    });
  };

  const onEditManually = () => {
    navigation.navigate(MainRoutes.DASHBOARD_TAB);
  };

  // ✅ IMPORTANT: ScreenContainer already scrolls. Do NOT wrap another ScrollView.
  return (
    <ScreenContainer title="Review & Confirm" scroll>
      <Text style={styles.subtitle}>
        Review what the AI added to your chart. You can edit anything now or later.
      </Text>

      {sections.map((s) => (
        <Card key={s.title} style={styles.card}>
          <Text style={styles.cardTitle}>{s.title}</Text>

          {Array.isArray(s.data) && s.data.length > 0 ? (
            s.data.map((item: any, idx: number) => (
              <Text key={idx} style={styles.item}>
                • {String(item)}
              </Text>
            ))
          ) : (
            <Text style={styles.empty}>No entries</Text>
          )}
        </Card>
      ))}

      <Button label="Confirm & Finish" onPress={onConfirm} />

      <View style={{ height: theme.spacing.sm }} />

      <Button label="Edit manually" variant="secondary" onPress={onEditManually} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    color: theme.colors.text,
  },
  item: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 4,
  },
  empty: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
