// src/features/preVisitPack/screens/PreVisitPackScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { SectionHeader } from "../../../ui/SectionHeader";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

import { preVisitPackService, type PreVisitPackResult } from "../services/preVisitPackService";
import { timelineService } from "../../medicalTimeline/services/timelineService";

const OPTIONS = [7, 14, 30] as const;

export default function PreVisitPackScreen() {
  const navigation = useNavigation<any>();

  const [days, setDays] = useState<(typeof OPTIONS)[number]>(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreVisitPackResult | null>(null);

  const headerSub = useMemo(() => {
    if (!result) return "Bundle your recent Daily Notes into a visit-ready brief.";
    return `Generated from last ${result.days} days • ${result.noteCount} notes`;
  }, [result]);

  const onGenerate = useCallback(async () => {
    try {
      setLoading(true);
      const r = await preVisitPackService.generate(days);
      setResult(r);
    } catch (e) {
      console.log("PreVisitPack generate error:", e);
      Alert.alert("Pre-Visit Pack", "Couldn’t generate right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  const onSaveToTimeline = useCallback(async () => {
    if (!result) return;

    try {
      setLoading(true);

      await timelineService.addEvent({
        type: "PRE_VISIT_PACK",
        category: "visits",
        summary: `Pre-Visit Pack (${result.days} days)`,
        detail: result.content,
        level: "info",
        timestamp: Date.now(),
        meta: {
          source: "pre_visit_pack",
          days: result.days,
          noteCount: result.noteCount,
        },
      } as any);

      Alert.alert("Saved", "Your Pre-Visit Pack was saved to your Timeline.");
      navigation.navigate(MainRoutes.TIMELINE_TAB as any);
    } catch (e) {
      console.log("PreVisitPack save error:", e);
      Alert.alert("Pre-Visit Pack", "Couldn’t save to Timeline.");
    } finally {
      setLoading(false);
    }
  }, [navigation, result]);

  const OptionChip = ({ value }: { value: number }) => {
    const active = days === value;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setDays(value as any)}
        style={[styles.chip, active ? styles.chipActive : null]}
      >
        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{value} days</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer showHeader headerCanGoBack title="Pre-Visit Pack" contentStyle={styles.container}>
      <SectionHeader title="Appointment coming up" />
      <Text style={styles.sub}>{headerSub}</Text>

      <Card style={styles.controlsCard}>
        <Text style={styles.label}>Select range</Text>
        <View style={styles.chipRow}>
          {OPTIONS.map((o) => (
            <OptionChip key={o} value={o} />
          ))}
        </View>

        <View style={{ height: theme.spacing.md }} />

        <Button
          label={loading ? "Generating…" : "Generate Pre-Visit Pack"}
          onPress={onGenerate}
          disabled={loading}
        />

        <View style={{ height: theme.spacing.sm }} />

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate(MainRoutes.DAILY_NOTES_LIST as any)}
          style={styles.secondaryRow}
        >
          <Feather name="edit-3" size={16} color={theme.colors.brand} />
          <Text style={styles.secondaryText}>Review Daily Notes</Text>
          <View style={{ flex: 1 }} />
          <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      {result ? (
        <>
          <SectionHeader title="Your Pre-Visit Pack" />
          <Text style={styles.sub}>Copy this into your notes app or read it at your visit.</Text>

          {/* ✅ Confidence + expectations block */}
          <Card style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <View style={styles.aboutIcon}>
                <Feather name="info" size={16} color={theme.colors.brand} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.aboutTitle}>About this summary</Text>
                <Text style={styles.aboutText}>
                  This Pre-Visit Pack is generated from your recent Daily Notes. Review it before your appointment and
                  edit anything that feels important.
                </Text>
                <Text style={styles.aboutFine}>
                  This helps you communicate clearly — it’s not a diagnosis or medical advice.
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.resultCard}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.resultText}>{result.content}</Text>
            </ScrollView>

            <View style={{ height: theme.spacing.md }} />

            <Button
              label={loading ? "Saving…" : "Save to Timeline"}
              variant="secondary"
              onPress={onSaveToTimeline}
              disabled={loading}
            />
          </Card>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: theme.spacing.md },

  sub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.sm,
  },

  controlsCard: {},

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  chipRow: { flexDirection: "row", gap: 10 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandTint,
  },
  chipText: { fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.text },

  secondaryRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.card,
  },
  secondaryText: { fontSize: 13, fontWeight: "900", color: theme.colors.text },

  // ✅ Confidence card
  aboutCard: { marginTop: theme.spacing.xs },
  aboutRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  aboutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.brandTint,
  },
  aboutTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.text, marginBottom: 4 },
  aboutText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, lineHeight: 16 },
  aboutFine: { marginTop: 8, fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, lineHeight: 15 },

  resultCard: { marginTop: theme.spacing.xs },
  resultText: { fontSize: 13, lineHeight: 19, color: theme.colors.text, fontWeight: "700" },
});
