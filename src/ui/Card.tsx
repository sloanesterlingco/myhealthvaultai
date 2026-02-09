// src/ui/Card.tsx
import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { theme } from "../theme";

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<Props> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,

    // Premium medical border (softer than a hard line)
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",

    // Premium depth (navy shadow instead of black)
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,

    marginBottom: theme.spacing.lg,
  },
});

