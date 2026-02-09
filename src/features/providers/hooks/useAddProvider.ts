// src/features/providers/hooks/useAddProvider.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useAddProvider = () => {
  const [provider, setProvider] = useState({
    name: "",
    specialty: "",
    phone: "",
    address: "",
    notes: "",
  });

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
      await patientService.addProvider(provider);
      showSuccess("Provider added!");
      navigation.goBack();
    } catch (err) {
      showError("Error adding provider.");
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
