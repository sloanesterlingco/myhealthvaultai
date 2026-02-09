// src/ui/Divider.tsx

import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../theme";

export const Divider = () => {
  return <View style={styles.line} />;
};

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
});
