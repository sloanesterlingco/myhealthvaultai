import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { OnsetInfo } from "../hooks/useHPI";

export default function OnsetSelector({
  value,
  onChange,
}: {
  value: OnsetInfo;
  onChange: (v: OnsetInfo) => void;
}) {
  const updateField = (field: keyof OnsetInfo, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Onset Details</Text>

      <Text style={styles.label}>Onset Type</Text>
      <TextInput
        style={styles.input}
        value={value.onsetType}
        onChangeText={(t) => updateField("onsetType", t)}
        placeholder="e.g., sudden, gradual"
      />

      <Text style={styles.label}>Onset Date</Text>
      <TextInput
        style={styles.input}
        value={value.onsetDate}
        onChangeText={(t) => updateField("onsetDate", t)}
        placeholder="e.g., 2025-01-12"
      />

      <Text style={styles.label}>Trigger</Text>
      <TextInput
        style={styles.input}
        value={value.onsetTrigger}
        onChangeText={(t) => updateField("onsetTrigger", t)}
        placeholder="e.g., at rest, during activity"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});
