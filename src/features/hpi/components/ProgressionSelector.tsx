import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function ProgressionSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Symptom Progression</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="e.g., Getting worse, improving, unchanged"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
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
