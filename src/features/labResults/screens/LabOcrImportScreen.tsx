// src/features/labResults/screens/LabOcrImportScreen.tsx
//
// Lab Report Scan (v1-safe)
// Flow:
// 1) Take photo of lab report
// 2) OCR -> raw text
// 3) Extract supported labs (A1c, LDL, HDL, Total Chol, Creatinine, eGFR)
// 4) Patient confirms/edits values + date
// 5) Save -> Firestore labs + timeline
//
// IMPORTANT: This screen provides NO interpretation, no advice, no flags.

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { auth } from "../../../lib/firebase";
import { theme } from "../../../theme";
import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";

import { ocrService } from "../../../services/ocrService";
import {
  proposeLabsFromOcr,
  saveLabFromOcr,
  type LabOcrCandidate,
} from "../services/labOcrImportService";

type Nav = NativeStackNavigationProp<MainRoutesParamList>;

function parseNumberInput(v: string): number | null {
  const cleaned = v.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export default function LabOcrImportScreen() {
  const navigation = useNavigation<Nav>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");

  const [detectedDate, setDetectedDate] = useState<string>("");
  const [candidates, setCandidates] = useState<LabOcrCandidate[]>([]);

  const [loadingOcr, setLoadingOcr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patientId = auth.currentUser?.uid ?? null;

  const hasCandidates = candidates.length > 0;

  const canSaveAny = useMemo(() => {
    if (!patientId) return false;
    return candidates.some((c) => Number.isFinite(c.value));
  }, [patientId, candidates]);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera permission needed",
        "Please allow camera access to scan lab reports."
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    setError(null);

    const ok = await requestCameraPermission();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setImageUri(uri);
    setOcrText("");
    setCandidates([]);
    setDetectedDate("");

    await runOcr(uri);
  };

  const runOcr = async (uriOverride?: string) => {
    setError(null);

    const uri = uriOverride ?? imageUri;
    if (!uri) {
      setError("Please take a photo first.");
      return;
    }

    if (!patientId) {
      setError("You are not signed in.");
      return;
    }

    try {
      setLoadingOcr(true);

      const res = await ocrService.recognizeImage(uri);
      const fullText = (res.fullText || "").trim();

      setOcrText(fullText);

      if (!fullText || fullText.length < 20) {
        setCandidates([]);
        setError("Could not read text clearly. Try retaking the photo with better lighting.");
        return;
      }

      const proposed = proposeLabsFromOcr(fullText);

      setDetectedDate(proposed.detectedDate || "");
      setCandidates(proposed.candidates || []);

      if (!proposed.candidates || proposed.candidates.length === 0) {
        setError(
          "No supported lab values found. Try another photo or ensure the lab names and numbers are visible."
        );
      }
    } catch (e: any) {
      console.log("Lab OCR error:", e);
      setError(e?.message ?? "OCR failed. Please try again.");
    } finally {
      setLoadingOcr(false);
    }
  };

  const updateCandidate = (index: number, patch: Partial<LabOcrCandidate>) => {
    setCandidates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const saveAll = async () => {
    setError(null);

    if (!patientId) {
      setError("You are not signed in.");
      return;
    }

    // Require date confirmation
    const dateToUse = detectedDate?.trim();
    if (!dateToUse) {
      Alert.alert(
        "Date needed",
        "Please enter the collection date (YYYY-MM-DD) before saving."
      );
      return;
    }

    try {
      setSaving(true);

      const saveTargets = candidates
        .map((c) => ({
          ...c,
          collectedAt: dateToUse,
        }))
        .filter((c) => Number.isFinite(c.value));

      if (saveTargets.length === 0) {
        setError("No valid values to save.");
        return;
      }

      for (const c of saveTargets) {
        await saveLabFromOcr({
          patientId,
          candidate: c,
        });
      }

      Alert.alert("Saved", "Lab values added to your history.", [
        {
          text: "OK",
          onPress: () => {
            // Navigate to existing labs list if it exists, else just go back
            try {
              navigation.navigate(MainRoutes.LAB_RESULTS_LIST as any);
            } catch {
              navigation.goBack();
            }
          },
        },
      ]);

      setImageUri(null);
      setOcrText("");
      setCandidates([]);
      setDetectedDate("");
    } catch (e: any) {
      console.log("Lab OCR save error:", e);
      setError(e?.message ?? "Could not save lab values.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan Lab Report</Text>
      <Text style={styles.subtitle}>
        Take a clear photo of your lab report. Confirm values before saving.
      </Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.primaryButton} onPress={takePhoto} disabled={loadingOcr || saving}>
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, (!imageUri || loadingOcr || saving) && styles.buttonDisabled]}
          onPress={() => runOcr()}
          disabled={!imageUri || loadingOcr || saving}
        >
          <Text style={styles.secondaryButtonText}>Run OCR</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>Photo</Text>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        </View>
      )}

      {loadingOcr && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Reading report…</Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Date */}
      {(hasCandidates || ocrText) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Collection date</Text>
          <Text style={styles.help}>
            Enter the date the labs were collected (YYYY-MM-DD). If unsure, use the report date.
          </Text>
          <TextInput
            style={styles.input}
            value={detectedDate}
            onChangeText={setDetectedDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
      )}

      {/* Candidates */}
      {hasCandidates && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detected lab values</Text>

          {candidates.map((c, idx) => (
            <View key={`${c.analyte}-${idx}`} style={styles.labRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labName}>{c.displayName}</Text>
                <Text style={styles.meta}>
                  Confidence: <Text style={styles.metaStrong}>{c.confidence.toUpperCase()}</Text>
                </Text>
              </View>

              <View style={styles.valueCol}>
                <Text style={styles.smallLabel}>Value</Text>
                <TextInput
                  style={styles.valueInput}
                  keyboardType="decimal-pad"
                  value={String(c.value ?? "")}
                  onChangeText={(v) => {
                    const n = parseNumberInput(v);
                    updateCandidate(idx, { value: n ?? (0 as any) });
                    if (n == null) {
                      // Keep the raw string in UI by temporarily storing NaN-like via 0; user will correct.
                      // Simpler: show error later if not finite.
                      updateCandidate(idx, { value: Number.NaN as any });
                    }
                  }}
                />

                <Text style={styles.smallLabel}>Unit</Text>
                <TextInput
                  style={styles.unitInput}
                  value={c.unit || ""}
                  onChangeText={(v) => updateCandidate(idx, { unit: v })}
                  placeholder="mg/dL"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveButton, (!canSaveAny || saving) && styles.buttonDisabled]}
            onPress={saveAll}
            disabled={!canSaveAny || saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Lab Values</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Raw OCR */}
      {ocrText ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>OCR Text (for your reference)</Text>
          <Text style={styles.ocrText}>{ocrText}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  previewCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: "#f3f4f6",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 10,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: "#dc2626",
    marginTop: 6,
    marginBottom: 10,
    fontWeight: "700",
  },
  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 10,
  },
  help: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 10,
    fontWeight: "600",
  },
  labRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  labName: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  valueCol: {
    width: 130,
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  valueInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  unitInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 14,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  metaStrong: {
    color: theme.colors.text,
    fontWeight: "900",
  },
  saveButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  ocrText: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  linkButton: {
    marginTop: 18,
    alignItems: "center",
    paddingVertical: 10,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: "900",
  },
});
