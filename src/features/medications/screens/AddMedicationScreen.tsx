// src/features/medications/screens/AddMedicationsScreen.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";
import { useAddMedication } from "../hooks/useAddMedication";

export default function AddMedicationsScreen() {
  const { medication, setField, saveMedication, saving } = useAddMedication();

  return (
    <ScreenContainer scroll title="Add Medication" headerCanGoBack contentStyle={styles.container}>
      <Text style={styles.title}>Add Medication</Text>

      <View style={styles.form}>
        <Input
          label="Name"
          value={medication.name}
          onChangeText={(t: string) => setField("name", t)}
          placeholder="e.g. Lisinopril"
        />

        <Input
          label="Dosage"
          value={medication.dosage}
          placeholder="e.g. 10mg"
          onChangeText={(t: string) => setField("dosage", t)}
        />

        <Input
          label="Frequency"
          value={medication.frequency}
          placeholder="e.g. Once daily"
          onChangeText={(t: string) => setField("frequency", t)}
        />

        <Input
          label="Start Date"
          value={medication.startDate}
          placeholder="YYYY-MM-DD"
          onChangeText={(t: string) => setField("startDate", t)}
        />

        <Input
          label="End Date"
          value={medication.endDate}
          placeholder="YYYY-MM-DD or leave blank"
          onChangeText={(t: string) => setField("endDate", t)}
        />

        <Input
          label="Notes"
          value={medication.notes}
          multiline
          numberOfLines={4}
          onChangeText={(t: string) => setField("notes", t)}
        />

        <Button
          label={saving ? "Saving..." : "Save Medication"}
          onPress={saveMedication}
          disabled={saving}
          loading={saving}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  form: {
    gap: theme.spacing.md,
  },
});
