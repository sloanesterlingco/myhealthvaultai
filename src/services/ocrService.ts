// src/services/ocrService.ts
// Unified OCR service for MyHealthVaultAI
// Deterministic V1 OCR endpoint + debug prints

import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { runOCR } from "./ocrApi";

export type OcrResult = {
  fullText: string;
  endpoint?: string;
  engine?: string;
  projectId?: string | null;
  region?: string | null;
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
    return await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  }

  async recognizeImage(uri: string): Promise<OcrResult> {
    const processedUri = await this.preprocessImage(uri);
    const base64Image = await this.fileToBase64(processedUri);

    const res = await runOCR({
      fileBase64: base64Image,
      mimeType: "image/jpeg",
      documentType: "medication_label",
      sourceType: "image",
      fileName: "upload.jpg",
    });

    console.log("[OCR recognizeImage] text sample =", (res?.text || "").slice(0, 120));

    return {
      fullText: (res?.text || "").trim(),
      endpoint: res?.endpoint,
      engine: res?.engine,
      projectId: res?.projectId ?? null,
      region: res?.region ?? null,
    };
  }

  async recognizePdf(base64Pdf: string): Promise<OcrResult> {
    const res = await runOCR({
      fileBase64: base64Pdf,
      mimeType: "application/pdf",
      documentType: "lab_report",
      sourceType: "pdf",
      fileName: "upload.pdf",
    });

    return {
      fullText: (res?.text || "").trim(),
      endpoint: res?.endpoint,
      engine: res?.engine,
      projectId: res?.projectId ?? null,
      region: res?.region ?? null,
    };
  }
}

export const ocrService = new OcrService();
