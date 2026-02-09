// src/features/patient/screens/DemographicsIntroScreen.tsx

import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

const TEAL = "#0B8E8E";
const CORAL = "#FF7A6E";

function OptionRow({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  tone = "default",
}: {
  icon: any;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  tone?: "default" | "primary";
}) {
  const isPrimary = tone === "primary";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.row}>
      <View style={[styles.iconWrap, isPrimary ? styles.iconWrapPrimary : null]}>
        <Feather name={icon} size={18} color={isPrimary ? "#FFFFFF" : TEAL} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>

      <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function DemographicsIntroScreen({ navigation }: any) {
  const goAiIntake = useCallback(() => {
    navigation.navigate(MainRoutes.CHART_SETUP_AI_CHAT);
  }, [navigation]);

  const goDemographics = useCallback(() => {
    navigation.navigate(MainRoutes.PATIENT_PROFILE);
  }, [navigation]);

  const goManualChart = useCallback(() => {
    // Manual chart ALWAYS starts at Symptoms first
    navigation.navigate(MainRoutes.ADD_SYMPTOM);
  }, [navigation]);

  return (
    <ScreenContainer showHeader title="Complete your chart" canGoBack scroll>
      <Text style={styles.lede}>
        Quick setup now saves time later. Pick what feels easiest — you can switch paths anytime.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Recommended</Text>

        <OptionRow
          icon="mic"
          title="AI-assisted intake"
          subtitle="Answer by voice or text. We’ll organize your symptoms + history (you can review before saving)."
          badge="Fastest"
          tone="primary"
          onPress={goAiIntake}
        />

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { marginTop: theme.spacing.md }]}>Basics</Text>

        <OptionRow
          icon="user"
          title="Patient demographics"
          subtitle="Name, DOB, insurance, and emergency contact — all in one place."
          onPress={goDemographics}
        />

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { marginTop: theme.spacing.md }]}>Manual entry</Text>

        <OptionRow
          icon="edit-3"
          title="Enter medical history yourself"
          subtitle="Conditions, surgeries, family/social history, allergies, and meds — at your pace."
          onPress={goManualChart}
        />
      </Card>

      <View style={{ height: theme.spacing.md }} />

      <Card style={styles.tipCard}>
        <Text style={styles.tipTitle}>You’re in control</Text>
        <Text style={styles.tipText}>
          Nothing is final until you review it. The goal is clarity — for you and your care team.
        </Text>
      </Card>

      <View style={{ height: theme.spacing.lg }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lede: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },

  card: { paddingVertical: theme.spacing.sm },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 142, 142, 0.10)",
  },

  iconWrapPrimary: {
    backgroundColor: TEAL,
  },

  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: "900", color: theme.colors.text },

  rowSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 122, 110, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 122, 110, 0.25)",
  },
  badgeText: { fontSize: 11, fontWeight: "900", color: CORAL },

  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: theme.spacing.md,
  },

  tipCard: { paddingVertical: theme.spacing.md },
  tipTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.text, marginBottom: 6 },
  tipText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, lineHeight: 16 },
});
