// src/ui/ScreenShell.tsx

import React, { ReactNode } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../theme";
import { MainRoutes } from "../navigation/types";

type Props = {
  children: ReactNode;

  /** If true, hides the AI button on this screen (useful on AI screens) */
  hideAiFab?: boolean;

  /** Where the AI button should navigate. Default: AI chat */
  aiRoute?: MainRoutes;

  /** Optional label override (default: "Ask AI") */
  aiLabel?: string;
};

export function ScreenShell({
  children,
  hideAiFab = false,
  aiRoute = MainRoutes.AI_CHAT,
  aiLabel = "Ask AI",
}: Props) {
  const nav = useNavigation<any>();

  return (
    <View style={styles.root}>
      {children}

      {!hideAiFab && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => nav.navigate(aiRoute)}
          activeOpacity={0.9}
        >
          <Feather name="message-circle" size={18} color="#fff" />
          <Text style={styles.fabText}>{aiLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: theme.colors.brand ?? theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",

    // ✅ Avoid `gap` for compatibility
    // we'll add spacing via margin on the icon wrapper
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  fabText: {
    marginLeft: 8,
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
