// src/ui/SectionHeader.tsx

import React from "react";
import { Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.header}>{title}</Text>
);

const styles = StyleSheet.create({
  header: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
});
