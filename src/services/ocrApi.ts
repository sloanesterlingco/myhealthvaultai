// src/services/ocrApi.ts
//
// OCR API client for Firebase HTTPS Function: ocrRecognize

export type OCRDocumentType =
  | "unknown"
  | "other"
  | "lab_report"
  | "medication_label"
  | "imaging_report"
  | "visit_note"
  | "insurance"
  | "receipt";

export type OCRSourceType =
  | "image"
  | "pdf"
  | "upload_record"
  | "medication_import"
  | "unknown";

export type OCRRecognizeRequest = {
  base64?: string;
  fileBase64?: string;
  imageBase64?: string;
  content?: string;

  mimeType: string;
  fileName?: string;

  documentType?: OCRDocumentType;
  sourceType?: OCRSourceType;

  fileUri?: string;
};

import { FIREBASE_CONFIG } from "../config/env";

export type OCRRecognizeResponse = {
  text: string;
};

function pickEnv(...keys: string[]): string | null {
  for (const k of keys) {
    const v = (process.env as any)[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function normalizeOcrUrl(urlOrBase: string): string {
  const u = urlOrBase.replace(/\/$/, "");

  if (u.toLowerCase().includes("ocrrecognize")) return u;
  if (u.toLowerCase().includes("cloudfunctions.net")) return `${u}/ocrRecognize`;
  return `${u}/ocrRecognize`;
}

function buildOcrUrl(): string {
  const explicit = pickEnv(
    "EXPO_PUBLIC_OCR_RECOGNIZE_URL",
    "EXPO_PUBLIC_OCR_URL",
    "EXPO_PUBLIC_OCR_ENDPOINT",
    "EXPO_PUBLIC_OCR_RECOGNIZE_ENDPOINT"
  );
  if (explicit) return normalizeOcrUrl(explicit);

  const base = pickEnv(
    "EXPO_PUBLIC_API_BASE_URL",
    "EXPO_PUBLIC_FUNCTIONS_BASE_URL",
    "EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL"
  );
  if (base) return normalizeOcrUrl(base);

  const projectId = FIREBASE_CONFIG?.projectId;
  const region =
    pickEnv("EXPO_PUBLIC_FUNCTIONS_REGION", "EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION") ||
    "us-central1";

  if (projectId) {
    return normalizeOcrUrl(`https://${region}-${projectId}.cloudfunctions.net`);
  }

  throw new Error("OCR endpoint not configured. Set EXPO_PUBLIC_OCR_RECOGNIZE_URL.");
}

function getBase64(req: OCRRecognizeRequest): string {
  const base64 = req.base64 || req.fileBase64 || req.imageBase64 || req.content;
  if (!base64) throw new Error("OCR request missing image base64 data.");
  return base64;
}

function swapRegion(url: string, from: string, to: string) {
  return url.replace(`https://${from}-`, `https://${to}-`);
}

function looksLikeFirebaseFunctionsUrl(url: string) {
  return url.includes(".cloudfunctions.net");
}

export async function runOCR(
  request: OCRRecognizeRequest
): Promise<OCRRecognizeResponse> {
  const url = buildOcrUrl();
  const base64 = getBase64(request);

    const payload = {
    // ✅ send multiple keys so the function definitely finds the content
    document: base64,
    base64: base64,
    fileBase64: base64,
    imageBase64: base64,
    content: base64,

    mimeType: request.mimeType,
    fileName: request.fileName ?? "upload.jpg",
    documentType: request.documentType ?? "unknown",
    sourceType: request.sourceType ?? "unknown",
  };


  const tryFetch = async (u: string) => {
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const t = await r.text();
    return { r, t, u };
  };

  // ✅ Try primary, then region fallback if it looks like functions URL
  const candidates: string[] = [url];

  if (looksLikeFirebaseFunctionsUrl(url)) {
    if (url.includes("https://us-central1-")) candidates.push(swapRegion(url, "us-central1", "us-east1"));
    if (url.includes("https://us-east1-")) candidates.push(swapRegion(url, "us-east1", "us-central1"));
  }

  let lastErr: any = null;

  for (const u of candidates) {
    try {
      const out = await tryFetch(u);

      if (!out.r.ok) {
        throw new Error(`OCR request failed (${out.r.status}) @ ${out.u}: ${out.t || ""}`);
      }

      try {
        const json = JSON.parse(out.t);
        return { text: String(json?.text || "") };
      } catch {
        return { text: out.t || "" };
      }
    } catch (e: any) {
      lastErr = e;
      continue;
    }
  }

  throw new Error(
    `OCR network failure. Tried: ${candidates.join(" , ")}. ${
      lastErr?.message ? String(lastErr.message) : "unknown"
    }`
  );
}
