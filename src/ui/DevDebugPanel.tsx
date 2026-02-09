// src/ui/DevDebugPanel.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export function DevDebugPanel({ title, text }: { title: string; text: string }) {
  if (!__DEV__ || !text) return null;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: "#B91C1C",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontWeight: "900",
    color: "#7F1D1D",
    marginBottom: 8,
    fontSize: 16,
  },
  body: {
    color: "#7F1D1D",
    fontSize: 12,
  },
});
