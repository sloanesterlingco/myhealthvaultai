import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

const TEAL = "#0B8E8E";

function ActionCard({
  icon,
  title,
  subtitle,
  cta,
  onPress,
  primary = false,
}: {
  icon: any;
  title: string;
  subtitle: string;
  cta: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.actionCard,
        primary ? styles.actionCardPrimary : undefined,
      ]}
    >
      <View style={styles.actionHeader}>
        <View
          style={[
            styles.iconWrap,
            primary ? styles.iconWrapPrimary : undefined,
          ]}
        >
          <Feather
            name={icon}
            size={18}
            color={primary ? "#FFFFFF" : TEAL}
          />
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
      </View>

      <Text style={styles.actionSub}>{subtitle}</Text>

      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>{cta}</Text>
        <Feather name="arrow-right" size={16} color={TEAL} />
      </View>
    </TouchableOpacity>
  );
}

export default function ChartSetupIntroScreen({ navigation }: any) {
  const startAiIntake = useCallback(() => {
    navigation.navigate(MainRoutes.CHART_SETUP_AI_CHAT);
  }, [navigation]);

  const startManualChart = useCallback(() => {
    navigation.navigate(MainRoutes.ADD_SYMPTOM);
  }, [navigation]);

  const goDemographics = useCallback(() => {
    navigation.navigate(MainRoutes.PATIENT_PROFILE);
  }, [navigation]);

  return (
    <ScreenContainer showHeader title="Complete your chart" scroll>
      <Text style={styles.lede}>
        This helps us organize your health information so it’s easy to review,
        share, and update over time. You can change or edit anything later.
      </Text>

      <Card>
        <Text style={styles.sectionLabel}>Recommended</Text>

        <ActionCard
          icon="mic"
          title="AI-assisted intake"
          subtitle="Answer by voice or text. We’ll guide you through symptoms and history and organize everything for you."
          cta="Start AI intake"
          primary
          onPress={startAiIntake}
        />
      </Card>

      <View style={{ height: theme.spacing.md }} />

      <Card>
        <Text style={styles.sectionLabel}>Manual options</Text>

        <ActionCard
          icon="edit-3"
          title="Enter medical history yourself"
          subtitle="Add symptoms, conditions, surgeries, allergies, and medications at your own pace."
          cta="Start chart"
          onPress={startManualChart}
        />

        <View style={styles.divider} />

        <ActionCard
          icon="user"
          title="Patient demographics"
          subtitle="Name, DOB, insurance, emergency contact, and profile photo."
          cta="Edit demographics"
          onPress={goDemographics}
        />
      </Card>

      <View style={{ height: theme.spacing.lg }} />

      <Card style={styles.reassureCard}>
        <Text style={styles.reassureTitle}>You’re always in control</Text>
        <Text style={styles.reassureText}>
          Nothing is shared or finalized without your review. The goal is clarity
          — for you and your care team.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lede: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  actionCard: {
    paddingVertical: theme.spacing.md,
  },

  actionCardPrimary: {},

  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,142,142,0.12)",
  },

  iconWrapPrimary: {
    backgroundColor: TEAL,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
  },

  actionSub: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  ctaText: {
    fontSize: 13,
    fontWeight: "900",
    color: TEAL,
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.sm,
  },

  reassureCard: {
    paddingVertical: theme.spacing.md,
  },

  reassureTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6,
  },

  reassureText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
});
