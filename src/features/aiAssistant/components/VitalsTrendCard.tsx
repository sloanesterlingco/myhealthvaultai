import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";

export interface VitalsTrendCardProps {
  type: string;
  trendDescription: string;
  latestValue?: string;
}

export const VitalsTrendCard: React.FC<VitalsTrendCardProps> = ({
  type,
  trendDescription,
  latestValue,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{type}</Text>
      {latestValue && <Text style={styles.value}>Latest: {latestValue}</Text>}
      <Text style={styles.trend}>{trendDescription}</Text>
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
    fontSize: 15,
    color: colors.primary,
    marginVertical: 6,
  },
  trend: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
