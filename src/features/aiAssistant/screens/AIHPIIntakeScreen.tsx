// src/features/aiAssistant/screens/AIHPIIntakeScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";

import { useHPI } from "../../hpi/hooks/useHPI";
import { generateHPIFromFreeText } from "../services/hpiIntakeService";
import type { HPIData } from "../../hpi/hooks/useHPI";

export default function AIHPIIntakeScreen() {
  const { hpi, updateField } = useHPI();

  const [description, setDescription] = useState("");
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleApplyAIResult = (partial: Partial<HPIData>) => {
    (Object.keys(partial) as (keyof HPIData)[]).forEach((key) => {
      const value = partial[key];
      if (value !== undefined) {
        // Type-safe update into HPI state
        updateField(key, value as any);
      }
    });
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      Alert.alert("Describe the problem", "Please enter a brief description first.");
      return;
    }

    setLoading(true);
    try {
      const partial = await generateHPIFromFreeText({
        freeText: description,
        age: age ? Number(age) : undefined,
        sex: sex || undefined,
      });

      handleApplyAIResult(partial);

      Alert.alert(
        "HPI Updated",
        "We've used AI to fill in the HPI fields. You can review and edit them on the structured HPI screen."
      );
    } catch (err: any) {
      console.error("Error generating HPI from AI:", err);
      Alert.alert(
        "AI Error",
        err?.message || "Sorry, we couldn't interpret this description."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AI-Guided HPI Intake</Text>

      <Text style={styles.label}>Who is this about?</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="Age (optional)"
          />
        </View>
        <View style={styles.half}>
          <TextInput
            style={styles.input}
            value={sex}
            onChangeText={setSex}
            placeholder="Sex (optional)"
          />
        </View>
      </View>

      <Text style={styles.label}>Describe what's going on</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Example: My 8-year-old son has had a runny nose for 6 days, then developed a cough and fever last night. He seems more tired today despite Tylenol."
        multiline
      />

      <View style={styles.buttonWrapper}>
        <Button
          title={loading ? "Analyzing..." : "Generate HPI with AI"}
          onPress={handleGenerate}
          disabled={loading}
        />
      </View>

      <Text style={styles.previewTitle}>Current HPI Snapshot</Text>
      <Text style={styles.previewText}>
        Chief Complaint: {hpi.chiefComplaint || "—"}
      </Text>
      <Text style={styles.previewText}>
        Duration: {hpi.duration || "—"}
      </Text>
      <Text style={styles.previewText}>
        Progression: {hpi.progression || "—"}
      </Text>
      <Text style={styles.previewText}>
        Severity: {hpi.severity || "—"}/10
      </Text>
      <Text style={styles.previewText}>
        Associated Symptoms:{" "}
        {hpi.associatedSymptoms.length > 0
          ? hpi.associatedSymptoms.join(", ")
          : "—"}
      </Text>
      <Text style={styles.previewText}>
        Treatments Tried:{" "}
        {hpi.treatmentsTried.length > 0
          ? hpi.treatmentsTried.join(", ")
          : "—"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  half: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  buttonWrapper: {
    marginTop: 20,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    marginBottom: 4,
  },
});
