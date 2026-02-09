// src/services/ocrService.ts
// Unified OCR service for MyHealthVaultAI
// Uses the same env-aware Firebase Functions URL builder as runOCR()

import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { runOCR } from "./ocrApi";

export type OcrResult = {
  fullText: string;
};

class OcrService {
  private async preprocessImage(uri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  }

  private async fileToBase64(uri: string): Promise<string> {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
  }

  async recognizeImage(uri: string): Promise<OcrResult> {
    const processedUri = await this.preprocessImage(uri);
    const base64Image = await this.fileToBase64(processedUri);

    const res = await runOCR({
      fileBase64: base64Image,
      mimeType: "image/jpeg",
      documentType: "lab_report",
      sourceType: "image",
      fileName: "upload.jpg",
    });

    return { fullText: (res?.text || "").trim() };
  }

  async recognizePdf(base64Pdf: string): Promise<OcrResult> {
    const res = await runOCR({
      fileBase64: base64Pdf,
      mimeType: "application/pdf",
      documentType: "lab_report",
      sourceType: "pdf",
      fileName: "upload.pdf",
    });

    return { fullText: (res?.text || "").trim() };
  }
}

export const ocrService = new OcrService();
