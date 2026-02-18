// src/features/aiAssistant/screens/ChartSetupReviewScreen.tsx
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const patient: any = patientAggregationService.getPatient?.() ?? {};

  const sections = useMemo(() => {
    const pmh =
      (patient?.conditions ?? [])
        .map((c: any) => (typeof c === "string" ? c : c?.name))
        .filter(Boolean);

    const psh =
      (patient?.surgeries ?? [])
        .map((s: any) => (typeof s === "string" ? s : s?.procedure))
        .filter(Boolean);

    const fam =
      (patient?.familyHistory ?? [])
        .map((f: any) => {
          if (typeof f === "string") return f;
          const rel = String(f?.relation ?? "").trim();
          const cond = String(f?.condition ?? "").trim();
          return [rel, cond].filter(Boolean).join(": ");
        })
        .filter(Boolean);

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
        .map((a: any) => (typeof a === "string" ? a : a?.allergen ?? a?.substance ?? a?.name))
        .filter(Boolean);

    const meds =
      (patient?.medications ?? [])
        .map((m: any) => (typeof m === "string" ? m : m?.name))
        .filter(Boolean);

    // Pull the most recent note(s) that likely include HPI
    const notes =
      (patient?.notes ?? [])
        .map((n: any) => String(n?.text ?? "").trim())
        .filter(Boolean)
        .slice(-2);

    return [
      { title: "Symptoms / HPI (notes)", data: notes },
      { title: "Past Medical History", data: pmh },
      { title: "Past Surgical History", data: psh },
      { title: "Family History", data: fam },
      { title: "Social History", data: social },
      { title: "Allergies", data: allergies },
      { title: "Medications", data: meds },
    ];
  }, [patient]);

  const onConfirm = async () => {
    if (!confirmed || saving) return;
    setSaving(true);

    try {
      // Re-enable auto persist now that user is explicitly confirming
      patientAggregationService.setAutoPersist(true);

      patientAggregationService.setChartSetupProgress?.({
        status: "complete",
        phase: "complete",
        completedAt: new Date().toISOString(),
      });

      await patientAggregationService.persistToFirestore?.();
    } catch {
      // If persist fails, keep user here
      setSaving(false);
      return;
    }

    setSaving(false);
    navigation.navigate(MainRoutes.DASHBOARD_TAB, { screen: MainRoutes.DASHBOARD });
  };

  const onEditManually = () => {
    navigation.navigate(MainRoutes.DASHBOARD_TAB);
  };

  return (
    <ScreenContainer title="Review & Confirm" scroll>
      <Text style={styles.subtitle}>
        Review what the interview captured. Nothing is saved until you confirm.
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

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setConfirmed((v) => !v)}
        style={styles.checkRow}
      >
        <View style={[styles.checkbox, confirmed && styles.checkboxOn]}>
          {confirmed ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
        <Text style={styles.checkText}>
          I confirm this information is accurate to the best of my knowledge.
        </Text>
      </TouchableOpacity>

      <Button
        label={saving ? "Saving…" : "Confirm & Save to Chart"}
        onPress={() => void onConfirm()}
        disabled={!confirmed || saving}
      />

      <View style={{ height: theme.spacing.sm }} />

      <Button
        label="Edit manually"
        variant="secondary"
        onPress={onEditManually}
        disabled={saving}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    fontWeight: "700",
  },
  card: { marginBottom: theme.spacing.sm },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
    color: theme.colors.text,
  },
  item: { fontSize: 13, color: theme.colors.text, marginBottom: 4, fontWeight: "700" },
  empty: { fontSize: 13, color: theme.colors.textMuted, fontWeight: "700" },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "transparent",
  },
  checkboxOn: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  checkboxTick: {
    color: "white",
    fontWeight: "900",
    marginTop: -1,
  },
  checkText: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: "800",
  },
});
