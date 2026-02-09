// src/features/aiAssistant/components/ChatInput.tsx

import React from "react";
import { Feather } from "@expo/vector-icons";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  TextInputProps,
} from "react-native";
import { theme } from "../../../theme";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Type your message…"
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        multiline
      />

      <TouchableOpacity style={styles.sendButton} onPress={onSend}>
        <Feather name="send" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    fontSize: 15,
    maxHeight: 120, // prevents overflow when typing multiple lines
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
