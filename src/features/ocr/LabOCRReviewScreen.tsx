// src/features/ocr/LabOCRReviewScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { OCRLabResult, OCRLabValue } from "../../types/ocrContracts";
import { saveLabEntry } from "../../services/labService";
import { useAuth } from "../../providers/AuthProvider";

export default function LabOCRReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const result = route.params?.result as OCRLabResult;

  const { user } = useAuth();
  const [labs, setLabs] = useState<OCRLabValue[]>(result?.labs || []);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return <Text>Not authenticated</Text>;
  if (!result) return <Text>Missing OCR result</Text>;

  const updateLab = (index: number, field: keyof OCRLabValue, value: any) => {
    const copy = [...labs];
    // @ts-ignore
    copy[index][field] = value;
    setLabs(copy);
  };

  const saveLabs = async () => {
    if (!confirmed) {
      Alert.alert("Confirm required", "Please confirm accuracy before saving.");
      return;
    }

    setSaving(true);

    try {
      for (const lab of labs) {
        if (!lab.detected) continue;
        if (lab.value == null) continue;
        if (!lab.unit?.trim()) continue;
        if (!lab.collectedDate?.trim()) continue;

        await saveLabEntry(user.uid, {
          analyte: lab.analyte,
          displayName: lab.displayName,
          value: lab.value,
          unit: lab.unit,
          collectedDate: lab.collectedDate,
          source: "ocr",
          rawText: result.rawText,
          patientReviewed: true,
        });
      }

      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save labs");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>
        Review Lab Results
      </Text>

      {labs.map((lab, index) => (
        <View
          key={`${lab.analyte}-${index}`}
          style={{
            marginBottom: 16,
            padding: 12,
            borderWidth: 1,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontWeight: "600" }}>{lab.displayName}</Text>

          <TextInput
            placeholder="Value"
            keyboardType="numeric"
            value={lab.value != null ? String(lab.value) : ""}
            onChangeText={(v) => updateLab(index, "value", v ? Number(v) : null)}
            style={{ borderBottomWidth: 1, marginBottom: 6 }}
          />

          <TextInput
            placeholder="Unit"
            value={lab.unit || ""}
            onChangeText={(v) => updateLab(index, "unit", v)}
            style={{ borderBottomWidth: 1, marginBottom: 6 }}
          />

          <TextInput
            placeholder="Collection Date (YYYY-MM-DD)"
            value={lab.collectedDate || ""}
            onChangeText={(v) => updateLab(index, "collectedDate", v)}
            style={{ borderBottomWidth: 1 }}
          />
        </View>
      ))}

      <View style={{ marginVertical: 16 }}>
        <Button
          title={confirmed ? "Confirmed" : "Confirm Accuracy"}
          onPress={() => setConfirmed(true)}
          disabled={confirmed}
        />
      </View>

      <Button
        title={saving ? "Saving..." : "Save Labs"}
        onPress={saveLabs}
        disabled={!confirmed || saving}
      />
    </ScrollView>
  );
}
