import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";

export default function ImpactSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const impactOptions = [
    "Work",
    "School",
    "Sleep",
    "Daily Activities",
    "Exercise",
    "Mood",
    "Appetite",
    "Mobility",
  ];

  // Extract existing note if present
  const existingNote = value.find((v) => v.startsWith("Note: ")) || "";
  const [note, setNote] = useState(existingNote.replace("Note: ", ""));

  const toggleImpact = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  const updateNote = (text: string) => {
    setNote(text);

    const filtered = value.filter((v) => !v.startsWith("Note: "));

    if (text.trim() === "") {
      onChange(filtered);
    } else {
      onChange([...filtered, `Note: ${text}`]);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Impact on Life</Text>

      <View style={styles.chipContainer}>
        {impactOptions.map((option) => {
          const selected = value.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => toggleImpact(option)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.subheading}>Additional Notes</Text>

      <TextInput
        style={styles.input}
        value={note}
        onChangeText={updateNote}
        placeholder="Describe how this affects daily life..."
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eee",
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: "#0077ff",
  },
  chipText: {
    color: "#333",
    fontSize: 14,
  },
  chipTextSelected: {
    color: "#fff",
  },
  subheading: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    minHeight: 60,
  },
});
