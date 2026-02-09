// src/features/medications/screens/MedicationOcrReviewScreen.tsx
//
// V1 Medication OCR Review
// - User reviews/edit extracted fields
// - Save as a Medication in Firestore
// - No medical advice

import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Input } from "../../../ui/Input";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";
import { patientService } from "../../../services/patientService";

function pickString(v: any): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

/**
 * Try to pull likely fields from whatever shape "result" is.
 * This is intentionally defensive because OCR payloads vary.
 */
function extractFields(result: any) {
  const r = result ?? {};

  // Common possibilities
  const name =
    pickString(r.name) ||
    pickString(r.medicationName) ||
    pickString(r.drugName) ||
    pickString(r.brandName) ||
    pickString(r.displayName) ||
    "";

  const dosage =
    pickString(r.dosage) ||
    pickString(r.dose) ||
    pickString(r.strength) ||
    pickString(r.doseText) ||
    "";

  const frequency =
    pickString(r.frequency) ||
    pickString(r.sig) ||
    pickString(r.directions) ||
    pickString(r.instructions) ||
    "";

  const notes =
    pickString(r.notes) ||
    pickString(r.rawText) ||
    pickString(r.text) ||
    "";

  return { name, dosage, frequency, notes };
}

export default function MedicationOcrReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const result = route?.params?.result;

  const initial = useMemo(() => extractFields(result), [result]);

  const [name, setName] = useState(initial.name);
  const [dosage, setDosage] = useState(initial.dosage);
  const [frequency, setFrequency] = useState(initial.frequency);
  const [notes, setNotes] = useState(initial.notes);

  const [saving, setSaving] = useState(false);

  const goToMedsList = () => {
    navigation.navigate(MainRoutes.MEDICATIONS_TAB, {
      screen: MainRoutes.MEDICATIONS_LIST,
    });
  };

  const onSave = async () => {
    const n = name.trim();
    const d = dosage.trim();
    const f = frequency.trim();

    if (!n) {
      Alert.alert("Missing name", "Please enter the medication name.");
      return;
    }

    try {
      setSaving(true);

      await patientService.addMedication({
        name: n,
        genericName: n, // V1 default (you can improve later)
        dosage: d || undefined,
        frequency: f || undefined,
        notes: notes?.trim() ? notes.trim() : undefined,

        // Optional: mark active by default
        status: "active",
      } as any);

      Alert.alert("Saved", "Medication added to your list.", [
        { text: "OK", onPress: goToMedsList },
      ]);
    } catch (e: any) {
      console.log("Medication OCR review save error:", e);
      Alert.alert("Save failed", e?.message ?? "Could not save medication. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      showHeader={true}
      title="Review Medication"
      headerCanGoBack={true}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <Card style={styles.card}>
        <Text style={styles.kicker}>Confirm details</Text>

        <Input label="Name" value={name} onChangeText={setName} />

        <Input label="Dosage" value={dosage} onChangeText={setDosage} />

        <Input label="Frequency" value={frequency} onChangeText={setFrequency} />

        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={5}
        />

        <View style={{ height: theme.spacing.md }} />

        <Button
          label={saving ? "Saving…" : "Save medication"}
          onPress={onSave}
          disabled={saving}
          style={styles.btnBrand}
        />

        <View style={{ height: theme.spacing.sm }} />

        <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.sm,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  btnBrand: {
    backgroundColor: theme.colors.brand,
  },
});
