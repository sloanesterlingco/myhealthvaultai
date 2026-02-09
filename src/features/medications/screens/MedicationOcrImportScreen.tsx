// src/features/medications/screens/MedicationOcrImportScreen.tsx
//
// V1 Medication Label Scan (camera-first)
// Flow:
// 1) Take photo of medication label
// 2) OCR -> raw text (Cloud Function via runOCR)
// 3) Propose medication fields from OCR text
// 4) Continue -> MedicationOcrReviewScreen (user confirms/edits + saves)
//
// IMPORTANT: Assistive only. User must confirm before saving.

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
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { auth } from "../../../lib/firebase";
import { runOCR } from "../../../services/ocrApi";
import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";

import {
  proposeMedicationFromOcr,
  type MedicationOcrCandidate,
} from "../services/medicationOcrImportService";

type Nav = NativeStackNavigationProp<MainRoutesParamList>;

async function preprocessToJpeg(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

function MedicationOcrImportScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();

  // declared in types.ts; safe fallback
  const documentType = route.params?.documentType ?? "medication_label";

  const patientId = auth.currentUser?.uid ?? null;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");

  const [candidate, setCandidate] = useState<MedicationOcrCandidate | null>(null);

  const [loadingOcr, setLoadingOcr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => {
    if (!patientId) return false;
    if (!candidate?.displayName?.trim()) return false;
    if (loadingOcr) return false;
    return true;
  }, [patientId, candidate, loadingOcr]);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera permission needed",
        "Please allow camera access to scan medication labels."
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
    setCandidate(null);

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

      const jpegUri = await preprocessToJpeg(uri);
      const base64 = await FileSystem.readAsStringAsync(jpegUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const resp = await runOCR({
        fileBase64: base64,
        mimeType: "image/jpeg",
        fileName: "medication_label.jpg",
        documentType,
        sourceType: "medication_import",
      });

      const text = (resp?.text || "").toString().trim();
      setOcrText(text);

      if (!text || text.length < 15) {
        setCandidate(null);
        setError("Could not read text clearly. Try retaking with better lighting.");
        return;
      }

      const proposed = proposeMedicationFromOcr(text);

      // Ensure raw text always travels forward
      const merged: MedicationOcrCandidate = {
        ...proposed,
        rawOcrText: proposed?.rawOcrText || text,
      } as any;

      setCandidate(merged);

      if (!merged?.displayName) {
        setError("Could not detect a medication name. You can still edit it on the next screen.");
      }
    } catch (e: any) {
      console.log("Medication OCR error:", e);
      setError(e?.message ?? "OCR failed. Please try again.");
    } finally {
      setLoadingOcr(false);
    }
  };

  const updateCandidate = (patch: Partial<MedicationOcrCandidate>) => {
    setCandidate((prev) => {
      if (!prev) {
        return {
          displayName: "",
          rawOcrText: ocrText || "",
          confidence: "low",
          ...patch,
        } as any;
      }
      return { ...prev, ...patch } as any;
    });
  };

  const continueToReview = () => {
    if (!candidate?.displayName?.trim()) {
      Alert.alert("Missing medication name", "Please enter a medication name.");
      return;
    }

    navigation.navigate(MainRoutes.MEDICATION_OCR_REVIEW, {
      result: {
        ...candidate,
        displayName: candidate.displayName.trim(),
        strength: candidate.strength?.trim() || "",
        directions: candidate.directions?.trim() || "",
        pharmacy: candidate.pharmacy?.trim() || "",
        rxNumber: candidate.rxNumber?.trim() || "",
        rawOcrText: candidate.rawOcrText || ocrText || "",
        confidence: candidate.confidence || "low",
        imageUri: imageUri || null, // optional, if you want to show it later
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan Medication Label</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.subtitle}>
          Take a clear photo of the label. You’ll review and save on the next screen.
        </Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.primaryButton, loadingOcr && styles.disabled]}
            onPress={takePhoto}
            disabled={loadingOcr}
          >
            <Text style={styles.primaryButtonText}>
              {imageUri ? "Retake Photo" : "Take Photo"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, (!imageUri || loadingOcr) && styles.disabled]}
            onPress={() => runOcr()}
            disabled={!imageUri || loadingOcr}
          >
            <Text style={styles.secondaryButtonText}>
              {loadingOcr ? "OCR..." : "Run OCR"}
            </Text>
          </TouchableOpacity>
        </View>

        {imageUri ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photo</Text>
            <Image source={{ uri: imageUri }} style={styles.preview} />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {candidate ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Review (quick) • {candidate.confidence?.toUpperCase?.() ?? "LOW"} confidence
            </Text>

            <Text style={styles.label}>Medication name</Text>
            <TextInput
              value={candidate.displayName}
              onChangeText={(v) => updateCandidate({ displayName: v })}
              placeholder="e.g., Lisinopril"
              placeholderTextColor="#777"
              style={styles.input}
              editable={!loadingOcr}
            />

            <Text style={styles.label}>Strength</Text>
            <TextInput
              value={candidate.strength ?? ""}
              onChangeText={(v) => updateCandidate({ strength: v })}
              placeholder="e.g., 10 mg"
              placeholderTextColor="#777"
              style={styles.input}
              editable={!loadingOcr}
            />

            <Text style={styles.label}>Directions</Text>
            <TextInput
              value={candidate.directions ?? ""}
              onChangeText={(v) => updateCandidate({ directions: v })}
              placeholder="e.g., Take 1 tablet by mouth daily"
              placeholderTextColor="#777"
              style={[styles.input, styles.multiline]}
              multiline
              editable={!loadingOcr}
            />

            <View style={styles.splitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Rx #</Text>
                <TextInput
                  value={candidate.rxNumber ?? ""}
                  onChangeText={(v) => updateCandidate({ rxNumber: v })}
                  placeholder="Rx number"
                  placeholderTextColor="#777"
                  style={styles.input}
                  editable={!loadingOcr}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Pharmacy</Text>
                <TextInput
                  value={candidate.pharmacy ?? ""}
                  onChangeText={(v) => updateCandidate({ pharmacy: v })}
                  placeholder="Pharmacy (optional)"
                  placeholderTextColor="#777"
                  style={styles.input}
                  editable={!loadingOcr}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.continueButton, !canContinue && styles.disabled]}
              onPress={continueToReview}
              disabled={!canContinue}
            >
              {loadingOcr ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.continueText}>Continue to Review & Save</Text>
              )}
            </TouchableOpacity>

            <View style={styles.rawCard}>
              <Text style={styles.rawTitle}>Raw OCR Text</Text>
              <Text style={styles.rawText}>{candidate.rawOcrText || ocrText}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default MedicationOcrImportScreen;
export { MedicationOcrImportScreen };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0B" },
  container: { padding: 16, paddingBottom: 40 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 8 },
  backText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  title: { color: "#fff", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "#BDBDBD", marginBottom: 12 },

  row: { flexDirection: "row", gap: 10, marginBottom: 8 },

  primaryButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#000", fontSize: 16, fontWeight: "900" },

  secondaryButton: {
    width: 120,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  secondaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },

  card: {
    backgroundColor: "#151515",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 10 },

  preview: { width: "100%", height: 220, borderRadius: 12, marginTop: 6 },

  errorCard: {
    backgroundColor: "#2A1111",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#5B1F1F",
  },
  errorText: { color: "#FFD5D5", fontWeight: "700" },

  label: { color: "#BDBDBD", fontSize: 12, marginTop: 10, marginBottom: 6 },

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

  splitRow: { flexDirection: "row", gap: 10, marginTop: 6 },

  continueButton: {
    marginTop: 14,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  rawCard: {
    marginTop: 14,
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#242424",
  },
  rawTitle: { color: "#BDBDBD", fontSize: 12, fontWeight: "900", marginBottom: 6 },
  rawText: { color: "#EAEAEA", fontSize: 12, lineHeight: 18 },

  disabled: { opacity: 0.55 },
});
