// src/features/providers/hooks/useEditProvider.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useEditProvider = (initialProvider) => {
  const [provider, setProvider] = useState(initialProvider);
  const { showLoading, hideLoading } = useLoading();
  const { showError, showSuccess } = useToast();
  const navigation = useNavigation();

  const setField = (key, value) => {
    setProvider((prev) => ({ ...prev, [key]: value }));
  };

  const saveProvider = async () => {
    if (!provider.name || !provider.specialty) {
      showError("Name and specialty are required.");
      return;
    }

    try {
      showLoading();
      await patientService.updateProvider(provider.id, provider);
      showSuccess("Provider updated!");
      navigation.goBack();
    } catch (err) {
      showError("Error saving provider.");
    } finally {
      hideLoading();
    }
  };

  return {
    provider,
    setField,
    saveProvider,
  };
};
