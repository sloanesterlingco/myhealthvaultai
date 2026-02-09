// src/features/labResults/hooks/useAddLabResult.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useAddLabResult = () => {
  const [labResult, setLabResult] = useState({
    testName: "",
    date: "",
    provider: "",
    resultSummary: "",
    notes: "",
  });

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
      await patientService.addLabResult(labResult);
      showSuccess("Lab result added!");
      navigation.goBack();
    } catch (err) {
      showError("Error adding lab result.");
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
