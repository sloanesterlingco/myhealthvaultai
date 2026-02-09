// src/features/labResults/hooks/useLabResultsList.js

import { useEffect, useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useLabResultsList = () => {
  const [labResults, setLabResults] = useState([]);

  const { showLoading, hideLoading } = useLoading();
  const { showError } = useToast();

  useEffect(() => {
    loadLabResults();
  }, []);

  const loadLabResults = async () => {
    try {
      showLoading();
      const list = await patientService.getLabResults();
      setLabResults(list || []);
    } catch (err) {
      showError("Failed to load lab results.");
    } finally {
      hideLoading();
    }
  };

  return {
    labResults,
    loadLabResults,
  };
};
