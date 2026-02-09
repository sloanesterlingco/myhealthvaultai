import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";

export interface ProviderSummaryCardProps {
  summary: string;
  providerName?: string;
}

export const ProviderSummaryCard: React.FC<ProviderSummaryCardProps> = ({
  summary,
  providerName,
}) => {
  return (
    <View style={styles.card}>
      {providerName && (
        <Text style={styles.provider}>{providerName}</Text>
      )}

      <Text style={styles.summary}>{summary}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: 10,
  },
  provider: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 6,
  },
  summary: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
