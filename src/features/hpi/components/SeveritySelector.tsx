import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";

export default function SeveritySelector({
  value,
  onChange,
}: {
  value: string;               // numeric string in HPIData
  onChange: (v: string) => void;
}) {
  // convert stored string → number for slider
  const numericValue = Number(value) || 0;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Severity</Text>

      <View style={styles.sliderRow}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={numericValue}
          onValueChange={(n) => onChange(String(n))}
          minimumTrackTintColor="#0077ff"
          maximumTrackTintColor="#ccc"
          thumbTintColor="#0077ff"
        />

        <Text style={styles.valueLabel}>{numericValue}/10</Text>
      </View>

      <Text style={styles.caption}>
        0 = No symptoms • 10 = Worst imaginable
      </Text>
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
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  slider: {
    flex: 1,
    height: 40,
  },
  valueLabel: {
    width: 50,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  caption: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
});
