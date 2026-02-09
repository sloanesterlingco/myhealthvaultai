import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../theme";

import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";

type Props = {
  primaryLabel: string;
  helperText: string;
  ctaLabel: string; // "Start" | "Resume"
  onStartOrResume: () => void;
  onNotNow: () => void;
};

export default function DashboardTodoCard({
  primaryLabel,
  helperText,
  ctaLabel,
  onStartOrResume,
  onNotNow,
}: Props) {
  return (
    <Card style={styles.todoCard}>
      <View style={styles.todoRow}>
        <View style={styles.todoIconCircle} />
        <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
          <Text style={styles.todoTitle}>{primaryLabel}</Text>
          <Text style={styles.todoSubtitle}>{helperText}</Text>
        </View>
      </View>

      <View style={{ height: theme.spacing.md }} />

      <Button label={ctaLabel} onPress={onStartOrResume} />

      <TouchableOpacity onPress={onNotNow} style={{ marginTop: theme.spacing.sm }}>
        <Text style={styles.todoDismiss}>Not now</Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  todoCard: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  todoRow: { flexDirection: "row", alignItems: "center" },
  todoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.brandTint,
  },
  todoTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: 2,
  },
  todoSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  todoDismiss: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
