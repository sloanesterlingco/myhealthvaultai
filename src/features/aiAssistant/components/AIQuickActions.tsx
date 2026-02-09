// src/features/aiAssistant/components/AIQuickActions.tsx

import React from "react";
import { Feather } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../../../theme";

export type AIQuickActionId =
  | "symptoms"
  | "medication"
  | "lab"
  | "summary"
  | "med_interactions";   // NEW ACTION

interface AIQuickActionsProps {
  onSelect: (id: AIQuickActionId) => void;
}

export const AIQuickActions: React.FC<AIQuickActionsProps> = ({ onSelect }) => {
  const actions: {
    id: AIQuickActionId;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }[] = [
    { id: "symptoms", label: "Explain Symptoms", icon: "activity" },
    { id: "medication", label: "Medication Safety", icon: "help-circle" },
    { id: "med_interactions", label: "Med Interactions", icon: "alert-triangle" }, // NEW
    { id: "lab", label: "Explain Lab Result", icon: "file-text" },
    { id: "summary", label: "Summarize My Chart", icon: "clipboard" },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={styles.action}
          onPress={() => onSelect(action.id)}
        >
          <Feather
            name={action.icon}
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.label}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  label: {
    marginLeft: 10,
    fontSize: 15,
    color: theme.colors.text,
  },
});

