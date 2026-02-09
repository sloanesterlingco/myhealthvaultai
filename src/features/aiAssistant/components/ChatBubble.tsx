// src/features/aiAssistant/components/ChatBubble.tsx

import { MotiView } from "moti";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../../theme";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatBubbleProps {
  role: ChatRole;
  text: string;
}

/**
 * ChatBubble
 * ----------
 * Now supports 3 roles:
 *  - user      → Right-aligned, primary color bubble
 *  - assistant → Left-aligned, neutral white bubble
 *  - system    → Centered gray banner (non-conversational)
 */

export const ChatBubble = ({ role, text }: ChatBubbleProps) => {
  if (role === "system") {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{text}</Text>
      </View>
    );
  }

  const isUser = role === "user";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 350 }}
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.aiBubble,
      ]}
    >
      <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
        {text}
      </Text>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "85%",
    padding: 14,
    marginBottom: 10,
    borderRadius: 18,
  },

  /** USER BUBBLE */
  userBubble: {
    backgroundColor: theme.colors.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  userText: {
    color: "#fff",
  },

  /** ASSISTANT BUBBLE */
  aiBubble: {
    backgroundColor: theme.colors.surface,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiText: {
    color: theme.colors.text,
  },

  /** SYSTEM MESSAGE */
  systemContainer: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.warning + "22", // translucent soft banner
  },
  systemText: {
    fontSize: 13,
    color: theme.colors.warning,
    textAlign: "center",
    fontWeight: "600",
  },

  text: {
    fontSize: 15,
    lineHeight: 20,
  },
});
