// src/features/vitals/components/SectionHeader.js

import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../../theme";

export const SectionHeader = ({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
