// src/services/ocrApi.ts
//
// OCR API client for Firebase HTTPS Function: ocrRecognizeV1
// V1 rule: deterministic endpoint (NO region fallback)

import { FIREBASE_CONFIG } from "../config/env";

export type OCRDocumentType =
  | "unknown"
  | "other"
  | "lab_report"
  | "medication_label"
  | "imaging_report"
  | "visit_note"
  | "insurance"
  | "receipt"
  | "record";

export type OCRSourceType =
  | "image"
  | "pdf"
  | "upload_record"
  | "medication_import"
  | "unknown";

export type OCRRecognizeRequest = {
  // ✅ Option A: base64 image (legacy path)
  base64?: string;
  fileBase64?: string;
  imageBase64?: string;
  content?: string;

  // ✅ Option B: Storage path (preferred for Records Vault)
  // Example: recordsVault/{uid}/{timestamp}_myfile
  storagePath?: string;

  mimeType: string;
  fileName?: string;

  documentType?: OCRDocumentType;
  sourceType?: OCRSourceType;

  fileUri?: string;
};

export type OCRRecognizeResponse = {
  text: string;
  endpoint: string;
  engine?: string;
  projectId?: string | null;
  region?: string | null;
  raw?: any;
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
  if (u.toLowerCase().includes("ocrrecognizev1")) return u;
  if (u.toLowerCase().includes("cloudfunctions.net")) return `${u}/ocrRecognizeV1`;
  return `${u}/ocrRecognizeV1`;
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
    pickEnv(
      "EXPO_PUBLIC_FUNCTIONS_REGION",
      "EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION"
    ) || "us-central1";

  if (projectId) {
    return normalizeOcrUrl(`https://${region}-${projectId}.cloudfunctions.net`);
  }

  throw new Error("OCR endpoint not configured. Set EXPO_PUBLIC_OCR_RECOGNIZE_URL.");
}

function pickBase64(req: OCRRecognizeRequest): string | null {
  return req.base64 || req.fileBase64 || req.imageBase64 || req.content || null;
}

export async function runOCR(request: OCRRecognizeRequest): Promise<OCRRecognizeResponse> {
  const endpoint = buildOcrUrl();

  const base64 = pickBase64(request);
  const storagePath = (request.storagePath || "").trim();

  if (!storagePath && !base64) {
    throw new Error("OCR request missing storagePath or image base64 data.");
  }

  // ✅ Payload supports BOTH styles; backend will choose storagePath if present.
  const payload: any = {
    mimeType: request.mimeType,
    fileName: request.fileName ?? "upload.jpg",
    documentType: request.documentType ?? "unknown",
    sourceType: request.sourceType ?? "unknown",
  };

  if (storagePath) {
    payload.storagePath = storagePath;
  }

  if (base64) {
    // Send multiple keys so backend always finds content (legacy clients)
    payload.document = base64;
    payload.base64 = base64;
    payload.fileBase64 = base64;
    payload.imageBase64 = base64;
    payload.content = base64;
  }

  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const t = await r.text();

  if (!r.ok) {
    throw new Error(`OCR request failed (${r.status}) @ ${endpoint}: ${t || ""}`);
  }

  let json: any = null;
  try {
    json = JSON.parse(t);
  } catch {
    json = null;
  }

  const text =
    String(
      json?.text ||
        json?.ocrText ||
        json?.recognizedText ||
        json?.rawText ||
        json?.result?.text ||
        json?.data?.text ||
        (json ? "" : t) ||
        ""
    ) || "";

  const engine = String(json?.engine || json?.raw?.engine || "") || undefined;
  const projectId = (json?.meta?.projectId ?? null) as string | null;
  const region = (json?.meta?.region ?? null) as string | null;

  console.log("[OCR] endpoint =", endpoint);
  console.log("[OCR] engine   =", engine);
  console.log("[OCR] project  =", projectId);
  console.log("[OCR] region   =", region);
  if (storagePath) console.log("[OCR] storagePath =", storagePath);

  return {
    text,
    endpoint,
    engine,
    projectId,
    region,
    raw: json?.raw ?? json ?? null,
  };
}
