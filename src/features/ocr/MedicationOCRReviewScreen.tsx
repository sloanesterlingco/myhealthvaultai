// src/features/ocr/MedicationOCRReviewScreen.tsx

import React, { useState } from "react";
import {
  Text,
  TextInput,
  Button,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { OCRMedicationResult } from "../../types/ocrContracts";
import { saveMedication } from "../../services/medicationService";
import { useAuth } from "../../providers/AuthProvider";

export default function MedicationOCRReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const result = route.params?.result as OCRMedicationResult;

  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [medication, setMedication] = useState({
    medicationName: result?.medication?.medicationName || "",
    strength: result?.medication?.strength || "",
    form: result?.medication?.form || "",
    sig: result?.medication?.sig || "",
    fillDate: result?.medication?.fillDate || "",
    prescriber: result?.medication?.prescriber || "",
    pharmacy: result?.medication?.pharmacy || "",
    rxNumber: result?.medication?.rxNumber || "",
  });

  if (!user) return <Text>Not authenticated</Text>;
  if (!result) return <Text>Missing OCR result</Text>;

  const updateField = (field: keyof typeof medication, value: string) => {
    setMedication((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    if (!confirmed) {
      Alert.alert("Confirm required", "Please confirm accuracy before saving.");
      return;
    }

    if (!medication.medicationName.trim()) {
      Alert.alert("Missing medication name");
      return;
    }

    setSaving(true);

    try {
      await saveMedication(user.uid, {
        medicationName: medication.medicationName.trim(),
        strength: medication.strength || undefined,
        form: medication.form || undefined,
        sig: medication.sig || undefined,
        fillDate: medication.fillDate || undefined,
        prescriber: medication.prescriber || undefined,
        pharmacy: medication.pharmacy || undefined,
        rxNumber: medication.rxNumber || undefined,
        active: true,
        source: "ocr",
        rawText: result.rawText,
        patientReviewed: true,
      });

      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save medication");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>
        Review Medication
      </Text>

      <TextInput
        placeholder="Medication name"
        value={medication.medicationName}
        onChangeText={(v) => updateField("medicationName", v)}
        style={{ borderBottomWidth: 1, marginBottom: 8 }}
      />

      <TextInput
        placeholder="Strength (e.g. 10 mg)"
        value={medication.strength}
        onChangeText={(v) => updateField("strength", v)}
        style={{ borderBottomWidth: 1, marginBottom: 8 }}
      />

      <TextInput
        placeholder="Form (tablet, capsule, etc.)"
        value={medication.form}
        onChangeText={(v) => updateField("form", v)}
        style={{ borderBottomWidth: 1, marginBottom: 8 }}
      />

      <TextInput
        placeholder="Directions (sig)"
        value={medication.sig}
        onChangeText={(v) => updateField("sig", v)}
        style={{ borderBottomWidth: 1, marginBottom: 8 }}
      />

      <TextInput
        placeholder="Fill date (YYYY-MM-DD)"
        value={medication.fillDate}
        onChangeText={(v) => updateField("fillDate", v)}
        style={{ borderBottomWidth: 1, marginBottom: 8 }}
      />

      <TextInput
        placeholder="Prescriber"
        value={medication.prescriber}
        onChangeText={(v) => updateField("prescriber", v)}
        style={{ borderBottomWidth: 1, marginBottom: 8 }}
      />

      <TextInput
        placeholder="Pharmacy"
        value={medication.pharmacy}
        onChangeText={(v) => updateField("pharmacy", v)}
        style={{ borderBottomWidth: 1, marginBottom: 8 }}
      />

      <TextInput
        placeholder="Rx number"
        value={medication.rxNumber}
        onChangeText={(v) => updateField("rxNumber", v)}
        style={{ borderBottomWidth: 1, marginBottom: 16 }}
      />

      <Button
        title={confirmed ? "Confirmed" : "Confirm Accuracy"}
        onPress={() => setConfirmed(true)}
        disabled={confirmed}
      />

      <Text style={{ height: 16 }} />

      <Button
        title={saving ? "Saving..." : "Save Medication"}
        onPress={save}
        disabled={!confirmed || saving}
      />
    </ScrollView>
  );
}
