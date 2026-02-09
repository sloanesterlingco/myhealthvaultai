// src/ui/layout/AuthScreen.tsx
import React, { ReactNode } from "react";
import { View, StyleSheet, Image } from "react-native";
import { theme } from "../../theme";

interface AuthScreenProps {
  children: ReactNode;
}

/**
 * Shared layout wrapper for all auth screens.
 * Centers content on a light background and adds padding.
 * ✅ Includes brand logo once to prevent duplication across auth screens.
 */
export default function AuthScreen({ children }: AuthScreenProps) {
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Image
          source={require("../branding/MHV-logo.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="MyHealthVaultAI logo"
        />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logo: {
    width: 200,
    height: 52,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
});
