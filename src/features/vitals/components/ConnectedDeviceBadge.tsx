// src/features/vitals/components/ConnectedDeviceBadge.tsx

import React from "react";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../../theme";

export const ConnectedDeviceBadge: React.FC<{ name?: string }> = ({ name }) => {
  if (!name) return null;

  return (
    <View style={styles.container}>
      <Feather name="bluetooth" size={16} color="#fff" />
      <Text style={styles.text} numberOfLines={1}>
        Connected: {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.brand ?? theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    color: "#fff",
    fontWeight: "800",
  },
});
