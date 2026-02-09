import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RedFlagAlert, RedFlagLevel } from "../services/redFlagService";

interface Props {
  alerts: RedFlagAlert[];
}

const severityStyles: Record<RedFlagLevel, any> = {
  critical: {
    backgroundColor: "#b91c1c",
    borderLeftWidth: 8,
    borderLeftColor: "#7f1d1d",
  },
  danger: {
    backgroundColor: "#ef4444",
    borderLeftWidth: 8,
    borderLeftColor: "#991b1b",
  },
  warning: {
    backgroundColor: "#f59e0b",
    borderLeftWidth: 8,
    borderLeftColor: "#b45309",
  },
};

const severityTitles: Record<RedFlagLevel, string> = {
  critical: "🚨 CRITICAL MEDICAL WARNING",
  danger: "⚠️ Serious Safety Concern",
  warning: "⚠ Monitor This Condition",
};

export const RedFlagBanner: React.FC<Props> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  const top = alerts[0];

  return (
    <View style={[styles.container, severityStyles[top.level]]}>
      <Text style={styles.title}>{severityTitles[top.level]}</Text>
      <Text style={styles.message}>{top.message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 10,
    marginVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  message: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});
