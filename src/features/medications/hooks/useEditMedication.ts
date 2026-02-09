// src/features/medications/hooks/useEditMedication.ts

import { useState } from "react";
import { Alert } from "react-native";
import { patientService } from "../../../services/patientService";

export const useEditMedication = (initialMedication: any) => {
  const [medication, setMedication] = useState<any>(initialMedication ?? {});

  const setField = (key: string, value: any) => {
    setMedication((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveMedication = async () => {
    // Basic required fields (matches your current V1 expectations)
    if (!medication?.name || !medication?.dosage || !medication?.frequency) {
      Alert.alert("Missing info", "Name, dosage, and frequency are required.");
      return false;
    }

    if (!medication?.id) {
      Alert.alert("Missing medication ID", "This medication cannot be updated yet.");
      return false;
    }

    try {
      await patientService.updateMedication(medication.id, medication);
      Alert.alert("Saved", "Medication updated.");
      return true;
    } catch (err) {
      Alert.alert("Save failed", "There was an error updating this medication.");
      return false;
    }
  };

  return {
    medication,
    setField,
    saveMedication,
  };
};
