import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";

export interface LabCardProps {
  test: string;
  value: string;
  timestamp?: string;
}

export const LabCard: React.FC<LabCardProps> = ({ test, value, timestamp }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{test}</Text>
      <Text style={styles.value}>{value}</Text>
      {timestamp && (
        <Text style={styles.timestamp}>
          {new Date(timestamp).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderColor: colors.border,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  value: {
    fontSize: 16,
    color: colors.accent,
    marginTop: 6,
  },
  timestamp: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textMuted,
  },
});
