// src/features/vitals/screens/VitalsDetailScreen.tsx

import React from "react";
import { Text, StyleSheet } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { theme } from "../../../theme";
import { MainRoutesParamList, MainRoutes } from "../../../navigation/types";
import VitalHistoryChart from "../components/VitalHistoryChart";

type R = RouteProp<MainRoutesParamList, MainRoutes.VITALS_DETAIL>;

export default function VitalsDetailScreen() {
  const route = useRoute<R>();

  // ✅ Fix: route.params can be undefined depending on your nav typing.
  const params = route.params ?? {
    type: "hr" as const,
    label: "Vitals",
    color: undefined,
  };

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{params.label ?? "Vitals"}</Text>

      <Card>
        <VitalHistoryChart type={params.type} take={20} />
      </Card>

      <Card>
        <Text style={styles.info}>
          This screen will evolve into a complete analytics dashboard with:
        </Text>
        <Text style={styles.info}>• 14-day trends</Text>
        <Text style={styles.info}>• Risk interpretation</Text>
        <Text style={styles.info}>• Sparkline preview</Text>
        <Text style={styles.info}>• Export to PDF</Text>
        <Text style={styles.info}>• AI-generated interpretations</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  info: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
});
