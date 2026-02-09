// src/services/ocrApi.ts

export type OCRDocumentType =
  | "lab_report"
  | "medication_label"
  | "imaging_report"
  | "other";

export type OCRSourceType = "image" | "camera" | "pdf" | "screenshot" | "unknown";

export type OCRRecognizeRequest = {
  fileBase64: string;
  mimeType?: string;
  sourceType?: OCRSourceType;
  documentType?: OCRDocumentType;

  fileUri?: string;
  fileName?: string;
};

export type OCRRecognizeResponse = {
  success?: boolean;
  text?: string;
  raw?: any;
  error?: string;
  details?: string;
};

function stripDataUriPrefix(b64: string) {
  if (!b64) return b64;
  const idx = b64.indexOf("base64,");
  if (idx >= 0) return b64.slice(idx + "base64,".length);
  return b64;
}

const PROJECT_ID = "myhealthvaultai";
const REGION = "us-central1";
const OCR_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/ocrRecognize`;

async function postJson(url: string, payload: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OCR failed (${res.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { success: true, text };
  }
}

export async function ocrRecognize(
  payload: OCRRecognizeRequest
): Promise<OCRRecognizeResponse> {
  const cleanedBase64 = stripDataUriPrefix(payload.fileBase64);
  const mime = (payload.mimeType || "").toLowerCase();
  const isPdf = mime.includes("pdf");

  // Send BOTH schemas to avoid any mismatch:
  const requestBody = {
    // schema 1 (your deployed backend accepts these)
    imageBase64: isPdf ? undefined : cleanedBase64,
    pdfBase64: isPdf ? cleanedBase64 : undefined,

    // schema 2 (some older callers in your app may expect this)
    fileBase64: cleanedBase64,
    mimeType: payload.mimeType || (isPdf ? "application/pdf" : "image/jpeg"),
    sourceType: payload.sourceType || "unknown",
    documentType: payload.documentType || "other",
  };

  return postJson(OCR_URL, requestBody);
}

// Legacy compatibility
export async function runOCR(
  payload: OCRRecognizeRequest
): Promise<OCRRecognizeResponse> {
  return ocrRecognize(payload);
}

export default {
  runOCR,
  ocrRecognize,
};