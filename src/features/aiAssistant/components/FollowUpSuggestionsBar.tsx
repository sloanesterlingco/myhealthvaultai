// src/features/aiAssistant/components/FollowUpSuggestionsBar.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../../theme";
import type { FollowUpSuggestions } from "../hooks/useAIChat";

interface Props {
  suggestions: FollowUpSuggestions | null;
  onSelect: (actionType: string, value: string) => void;
}

export const FollowUpSuggestionsBar: React.FC<Props> = ({
  suggestions,
  onSelect,
}) => {
  if (!suggestions) return null;

  const {
    trackSymptoms,
    addConcerns,
    suggestGoals,
    flagProviderTopics,
    riskWarnings,
  } = suggestions;

  const renderChip = (
    label: string,
    icon: keyof typeof Feather.glyphMap,
    color: string,
    actionType: string,
    value: string
  ) => (
    <TouchableOpacity
      key={`${actionType}-${value}`}
      style={[styles.chip, { borderColor: color }]}
      onPress={() => onSelect(actionType, value)}
    >
      <Feather name={icon} size={16} color={color} style={{ marginRight: 6 }} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 10 }}
      >
        {/* Track Symptoms */}
        {trackSymptoms.map((symptom) =>
          renderChip(
            `Track "${symptom}"`,
            "activity",
            theme.colors.primary,
            "trackSymptoms",
            symptom
          )
        )}

        {/* Add Concerns */}
        {addConcerns.map((concern) =>
          renderChip(
            `Note concern: "${concern}"`,
            "alert-circle",
            theme.colors.warning ?? "#f39c12",
            "addConcerns",
            concern
          )
        )}

        {/* Suggest Goals */}
        {suggestGoals.map((goal) =>
          renderChip(
            `Set goal: "${goal}"`,
            "target",
            theme.colors.success ?? "#2ecc71",
            "suggestGoals",
            goal
          )
        )}

        {/* Flag Provider Topics */}
        {flagProviderTopics.map((topic) =>
          renderChip(
            `Mention to provider: "${topic}"`,
            "clipboard",
            theme.colors.info ?? "#3498db",
            "flagProviderTopics",
            topic
          )
        )}

        {/* Risk Warnings - Styled as red advisory chips */}
        {riskWarnings.map((warning, index) => (
          <View
            key={`warning-${index}`}
            style={[styles.warningChip, { backgroundColor: theme.colors.error + "20" }]}
          >
            <Feather
              name="alert-triangle"
              size={16}
              color={theme.colors.error}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.warningText, { color: theme.colors.error }]}>
              {warning}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingLeft: 10,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 10,
    backgroundColor: "#fff",
  },

  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },

  warningChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },

  warningText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
