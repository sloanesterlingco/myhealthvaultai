// src/features/labResults/hooks/useEditLabResult.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useEditLabResult = (initialLabResult) => {
  const [labResult, setLabResult] = useState(initialLabResult);
  const { showLoading, hideLoading } = useLoading();
  const { showError, showSuccess } = useToast();
  const navigation = useNavigation();

  const setField = (key, value) => {
    setLabResult((prev) => ({ ...prev, [key]: value }));
  };

  const saveLabResult = async () => {
    if (!labResult.testName || !labResult.date) {
      showError("Test name and date are required.");
      return;
    }

    try {
      showLoading();
      await patientService.updateLabResult(labResult.id, labResult);
      showSuccess("Lab result updated!");
      navigation.goBack();
    } catch (err) {
      showError("Error updating lab result.");
    } finally {
      hideLoading();
    }
  };

  return {
    labResult,
    setField,
    saveLabResult,
  };
};
