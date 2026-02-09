// src/features/aiAssistant/components/InteractionAlertBanner.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  title: string;
  message: string;
  severity: "critical" | "danger" | "warning";
}

export const InteractionAlertBanner: React.FC<Props> = ({
  title,
  message,
  severity,
}) => {
  return (
    <View style={[styles.container, styles[severity]]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 10,
    marginVertical: 10,
  },

  // Colors align with your RedFlagBanner system
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

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
});
