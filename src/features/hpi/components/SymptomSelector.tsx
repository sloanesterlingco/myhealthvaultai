import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function SymptomSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  // For now, a universal symptom list
  const symptomOptions = [
    "Fever",
    "Cough",
    "Runny Nose",
    "Fatigue",
    "Headache",
    "Sore Throat",
    "Shortness of Breath",
    "Chest Pain",
    "Nausea",
    "Vomiting",
    "Diarrhea",
    "Dizziness",
    "Body Aches",
  ];

  const toggleSymptom = (symptom: string) => {
    if (value.includes(symptom)) {
      onChange(value.filter((v) => v !== symptom));
    } else {
      onChange([...value, symptom]);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Associated Symptoms</Text>

      <View style={styles.chipContainer}>
        {symptomOptions.map((symptom) => {
          const isSelected = value.includes(symptom);

          return (
            <Pressable
              key={symptom}
              onPress={() => toggleSymptom(symptom)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {symptom}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
});
