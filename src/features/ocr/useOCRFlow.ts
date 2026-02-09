// src/features/ocr/useOCRFlow.ts

import { runOCR } from "../../services/ocrApi";
import { useNavigation } from "@react-navigation/native";

export function useOCRFlow() {
  const navigation = useNavigation<any>();

  async function startOCR(
    payload: {
      fileBase64: string;
      mimeType: string;
      sourceType: any;
      documentType: any;
    },
    onComplete: () => void
  ) {
    const result = await runOCR(payload);

    if (result.type === "lab") {
      navigation.navigate("LabOCRReview", {
        result,
        onComplete,
      });
    } else {
      navigation.navigate("MedicationOCRReview", {
        result,
        onComplete,
      });
    }
  }

  return { startOCR };
}
