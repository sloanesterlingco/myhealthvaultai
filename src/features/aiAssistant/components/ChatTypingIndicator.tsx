// src/features/aiAssistant/components/ChatTypingIndicator.tsx

import React from "react";
import { View, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { theme } from "../../../theme";

/**
 * Elegant animated typing indicator for AI responses.
 * 3 dots that fade + rise in a smooth loop.
 */
export const ChatTypingIndicator = () => {
  return (
    <View style={styles.container}>
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ opacity: 0.3, translateY: 0 }}
          animate={{ opacity: 1, translateY: -4 }}
          transition={{
            duration: 600,
            delay: i * 150,
            loop: true,
            type: "timing",
          }}
          style={styles.dot}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textMuted,
  },
});
