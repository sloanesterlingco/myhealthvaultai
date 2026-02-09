// src/features/ocr/screens/OcrImportScreen.tsx

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useNavigation } from "@react-navigation/native";
import { addDoc, collection } from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";
import { runOCR, type OCRDocumentType } from "../../../services/ocrApi";

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

const DOC_TYPES: { label: string; value: OCRDocumentType }[] = [
  { label: "Lab Report", value: "lab_report" },
  { label: "Medication Label", value: "medication_label" },
  { label: "Imaging Report", value: "imaging_report" },
  { label: "Visit Note", value: "visit_note" },
  { label: "Insurance", value: "insurance" },
  { label: "Receipt", value: "receipt" },
  { label: "Other", value: "other" },
];

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User is not authenticated");
  return uid;
}

function isPdf(mimeType: string) {
  return mimeType?.toLowerCase() === "application/pdf";
}

export default function OcrImportScreen() {
  const navigation = useNavigation();

  const [isLoading, setLoading] = useState(false);

  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [ocrText, setOcrText] = useState<string>("");

  const [documentType, setDocumentType] = useState<OCRDocumentType>("other");
  const [notes, setNotes] = useState<string>("");

  const canRun = useMemo(() => !!picked && !isLoading, [picked, isLoading]);
  const canSave = useMemo(() => !!ocrText && !isLoading, [ocrText, isLoading]);

  async function pickFile() {
    try {
      setLoading(true);
      setPicked(null);
      setOcrText("");

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error("No file selected");

      setPicked({
        uri: asset.uri,
        name: asset.name || "upload",
        mimeType: asset.mimeType || "application/octet-stream",
        size: asset.size,
      });
    } catch (e: any) {
      Alert.alert("File picker failed", e?.message || "Unable to pick a file.");
    } finally {
      setLoading(false);
    }
  }

  async function runOcrNow() {
    if (!picked) return;

    try {
      setLoading(true);
      setOcrText("");

      const base64 = await FileSystem.readAsStringAsync(picked.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const sourceType = isPdf(picked.mimeType) ? "pdf" : "image";

      const resp = await runOCR({
        fileBase64: base64,
        mimeType: picked.mimeType,
        sourceType,
        documentType,
        fileUri: picked.uri, // UI-only metadata (accepted by type)
        fileName: picked.name,
      });

      setOcrText((resp?.text || "").toString());
    } catch (e: any) {
      Alert.alert("OCR failed", e?.message || "Unable to read text from the file.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToTimeline() {
    try {
      setLoading(true);

      const uid = requireUid();

      const nowMs = Date.now();
      const date = new Date().toISOString().slice(0, 10);

      const ref = collection(db, "patients", uid, "timelineEvents");

      await addDoc(ref, {
        type: "OCR_IMPORT",
        summary: `OCR Imported (${documentType})`,
        detail: notes?.trim() || null,
        date,
        timestamp: nowMs,
        level: "low",
        meta: {
          documentType,
          fileName: picked?.name || null,
          mimeType: picked?.mimeType || null,
          ocrText,
        },
        createdAt: nowMs.toString(),
      });

      Alert.alert("Saved", "Saved to timeline.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Unable to save to timeline.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Upload Record</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.disabled]}
            onPress={pickFile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryButtonText}>Choose File</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, !canRun && styles.disabled]}
            onPress={runOcrNow}
            disabled={!canRun}
          >
            <Text style={styles.secondaryButtonText}>Run OCR</Text>
          </TouchableOpacity>
        </View>

        {picked ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Selected</Text>
            <Text style={styles.metaText}>Name: {picked.name}</Text>
            <Text style={styles.metaText}>Type: {picked.mimeType}</Text>
            {typeof picked.size === "number" ? (
              <Text style={styles.metaText}>Size: {picked.size} bytes</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Document Type</Text>
          <View style={styles.pills}>
            {DOC_TYPES.map((t) => {
              const active = t.value === documentType;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setDocumentType(t.value)}
                  disabled={isLoading}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note or tag..."
            placeholderTextColor="#777"
            style={[styles.input, styles.multiline]}
            multiline
            editable={!isLoading}
          />
        </View>

        {ocrText ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>OCR Result</Text>
            <Text style={styles.rawText}>{ocrText}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.backButton, isLoading && styles.disabled]}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.disabled]}
                onPress={saveToTimeline}
                disabled={!canSave}
              >
                <Text style={styles.saveButtonText}>Save to Timeline</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0B0B" },
  content: { padding: 16, paddingBottom: 48 },

  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 12 },

  row: { flexDirection: "row", gap: 10 },

  primaryButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#000", fontSize: 16, fontWeight: "800" },

  secondaryButton: {
    width: 120,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  secondaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  card: {
    backgroundColor: "#151515",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 10 },
  metaText: { color: "#BDBDBD", fontSize: 12, marginBottom: 6 },

  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#101010",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: "#fff", borderColor: "#fff" },
  pillText: { color: "#E0E0E0", fontSize: 12, fontWeight: "700" },
  pillTextActive: { color: "#000" },

  label: { color: "#BDBDBD", fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#0F0F0F",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#242424",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },

  rawText: { color: "#EAEAEA", fontSize: 12, lineHeight: 18 },

  actions: { flexDirection: "row", gap: 10, marginTop: 14 },

  backButton: {
    flex: 1,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  backButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  saveButton: {
    flex: 1,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },

  disabled: { opacity: 0.55 },
});
