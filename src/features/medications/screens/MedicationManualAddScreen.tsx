import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";
import { theme } from "../../../theme";
import { patientService } from "../../../services/patientService";

type Nav = NativeStackNavigationProp<MainRoutesParamList>;

export default function MedicationManualAddScreen() {
  const navigation = useNavigation<Nav>();

  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [route, setRoute] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const n = name.trim();
    if (!n) {
      Alert.alert("Missing name", "Please enter the medication name.");
      return;
    }

    setSaving(true);
    try {
      await patientService.addMedication({
        name: n,
        genericName: genericName.trim() || n,
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        route: route.trim(),
        source: "manual",
      });

      Alert.alert("Saved", "Medication added.");

      // ✅ Go directly to the list screen
      navigation.navigate(MainRoutes.MEDICATIONS_LIST);
    } catch (e: any) {
      console.warn("addMedication failed:", e);
      Alert.alert(
        "Could not save",
        e?.message ? String(e.message) : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Medication</Text>
      <Text style={styles.subtitle}>Manual entry (v1).</Text>

      <Text style={styles.label}>Medication name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="e.g., Metformin" />

      <Text style={styles.label}>Generic name (optional)</Text>
      <TextInput value={genericName} onChangeText={setGenericName} style={styles.input} placeholder="e.g., metformin" />

      <Text style={styles.label}>Dosage (optional)</Text>
      <TextInput value={dosage} onChangeText={setDosage} style={styles.input} placeholder="e.g., 500 mg" />

      <Text style={styles.label}>Frequency (optional)</Text>
      <TextInput value={frequency} onChangeText={setFrequency} style={styles.input} placeholder="e.g., twice daily" />

      <Text style={styles.label}>Route (optional)</Text>
      <TextInput value={route} onChangeText={setRoute} style={styles.input} placeholder="e.g., oral" />

      <Pressable style={[styles.button, saving ? styles.buttonDisabled : undefined]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save medication"}</Text>
      </Pressable>

      <Pressable style={styles.link} onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: theme.colors.background ?? "#fff" },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.text ?? "#111827" },
  subtitle: { marginTop: 6, fontSize: 14, color: theme.colors.textMuted ?? "#6b7280", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#fff" },
  button: { marginTop: 18, backgroundColor: "#111827", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  link: { marginTop: 14, alignItems: "center" },
  linkText: { color: "#111827", fontWeight: "800" },
});

