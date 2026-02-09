import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function DurationSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Duration</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="e.g., 3 days, 1 week, since last night"
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
