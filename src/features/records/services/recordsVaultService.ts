// src/features/records/services/recordsVaultService.ts

import * as FileSystem from "expo-file-system/legacy";
import { auth, db, storage } from "../../../lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";

export type RecordsVaultItem = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  mimeType: string;
  documentType: string; // "record" | "lab_report" | etc
  fileUrl: string;
  ocrText?: string | null;
};

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You are not signed in.");
  return uid;
}

function safeFileName(name: string) {
  const trimmed = (name || "").trim() || "record";
  return trimmed
    .replace(/[^\w\- ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function guessContentType(mimeType?: string, uri?: string) {
  if (mimeType && mimeType.length > 0) return mimeType;

  const lower = (uri || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

export async function uploadRecordFileFromUri(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string;
}): Promise<{ downloadUrl: string; storagePath: string; contentType: string }> {
  const uid = requireUid();

  const contentType = guessContentType(params.mimeType, params.fileUri);

  const base64 = await FileSystem.readAsStringAsync(params.fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const name = safeFileName(params.fileName);
  const storagePath = `recordsVault/${uid}/${Date.now()}_${name}`;

  const storageRef = ref(storage, storagePath);

  await uploadString(storageRef, base64, "base64", { contentType });

  const downloadUrl = await getDownloadURL(storageRef);

  return { downloadUrl, storagePath, contentType };
}

export async function saveRecordToFirestore(params: {
  title: string;
  documentType: string; // "record" or more specific later
  mimeType: string;
  fileUrl: string;
  ocrText?: string | null;
}): Promise<void> {
  const uid = requireUid();

  const nowMs = Date.now();
  const date = new Date(nowMs).toISOString().slice(0, 10);

  // 1) Records Vault collection (for Docs tab list)
  const vaultRef = collection(db, "patients", uid, "recordsVault");
  const recordDoc = await addDoc(vaultRef, {
    title: params.title,
    documentType: params.documentType,
    mimeType: params.mimeType,
    fileUrl: params.fileUrl,
    ocrText: params.ocrText ?? null,
    date,
    timestamp: nowMs,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2) Timeline card (so it shows up in the Medical Timeline)
  const timelineRef = collection(db, "patients", uid, "timelineEvents");
  await addDoc(timelineRef, {
    type: "RECORD_UPLOAD",
    summary: params.title,
    detail: "Uploaded record saved to Records Vault.",
    date,
    timestamp: nowMs,
    level: "low",
    meta: {
      recordId: recordDoc.id,
      fileUrl: params.fileUrl,
      mimeType: params.mimeType,
      documentType: params.documentType,
      ocrText: params.ocrText ?? null,
    },
    createdAt: nowMs.toString(),
  });
}

export async function listRecordsVault(): Promise<RecordsVaultItem[]> {
  const uid = requireUid();

  const vaultRef = collection(db, "patients", uid, "recordsVault");
  const q = query(vaultRef, orderBy("timestamp", "desc"));

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      title: String(data.title || "Record"),
      date: String(data.date || ""),
      timestamp: Number(data.timestamp || 0),
      mimeType: String(data.mimeType || ""),
      documentType: String(data.documentType || "record"),
      fileUrl: String(data.fileUrl || ""),
      ocrText: data.ocrText ?? null,
    };
  });
}
