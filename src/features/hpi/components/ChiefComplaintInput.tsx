import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function ChiefComplaintInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Chief Complaint</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="e.g., Fever and cough"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});
