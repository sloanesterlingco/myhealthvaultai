// src/features/providers/hooks/useProviderCardScanner.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useToast } from "../../../hooks/useToast";
import { MainRoutes } from "../../../navigation/types";

export const useProviderCardScanner = () => {
  const { showSuccess } = useToast();
  const navigation = useNavigation();

  const [scannedResult, setScannedResult] = useState(null);

  const simulateScan = () => {
    // Mock OCR result — replace with actual OCR later
    const mockData = {
      name: "Dr. Jane Carter",
      specialty: "Cardiology",
      phone: "555-982-1122",
      address: "1200 Heart Ave, Suite 205",
      notes: "Imported via card scanner",
    };

    setScannedResult(mockData);
    showSuccess("Card scanned!");
  };

  const importToAddProvider = () => {
    if (!scannedResult) return;

    navigation.navigate(MainRoutes.ADD_PROVIDER, { preload: scannedResult });
  };

  return {
    scannedResult,
    simulateScan,
    importToAddProvider,
  };
};
