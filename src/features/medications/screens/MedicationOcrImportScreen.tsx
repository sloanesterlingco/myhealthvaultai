// src/features/medications/screens/MedicationOcrImportScreen.tsx
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
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

async function uriToBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export default function MedicationOcrImportScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();

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
    return true;
  }, [patientId, candidate]);

  const pickImage = async () => {
    setError(null);
    setCandidate(null);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (res.canceled) return;

    const uri = res.assets?.[0]?.uri;
    if (!uri) return;

    setImageUri(uri);
  };

  const takePhoto = async () => {
    setError(null);
    setCandidate(null);

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (res.canceled) return;

    const uri = res.assets?.[0]?.uri;
    if (!uri) return;

    setImageUri(uri);
  };

  const run = async () => {
    if (!imageUri) {
      Alert.alert("No image", "Please select or take a photo first.");
      return;
    }

    try {
      setLoadingOcr(true);
      setError(null);

      const jpegUri = await preprocessToJpeg(imageUri);
      const base64 = await uriToBase64(jpegUri);

      const res = await runOCR({
        fileBase64: base64,
        mimeType: "image/jpeg",
        sourceType: "image",
        documentType,
        fileName: "medication.jpg",
      });

      const text = (res?.text || "").trim();
      setOcrText(text);

      if (!text || text.length < 15) {
        setCandidate({
          displayName: "",
          strength: "",
          directions: "",
          pharmacy: "",
          rxNumber: "",
          rawOcrText: text || "",
          confidence: "low",

          // extra fields (optional)
          pharmacyPhone: "",
          ndc: "",
          quantity: "",
          refills: "",
          fillDate: "",
          prescriber: "",
          patientName: "",
        } as any);

        setError(
          "OCR text was weak/empty. You can still type the medication name and continue."
        );
        return;
      }

      const proposed = proposeMedicationFromOcr(text);

      const merged: MedicationOcrCandidate = {
        ...proposed,
        rawOcrText: proposed.rawOcrText || text,
      };

      setCandidate(merged);
    } catch (e: any) {
      console.log("Medication OCR error:", e);
      setError(e?.message ?? "OCR failed. Please try again.");
    } finally {
      setLoadingOcr(false);
    }
  };

  const goToReview = () => {
    if (!candidate?.displayName?.trim()) {
      Alert.alert("Missing medication name", "Please enter a medication name.");
      return;
    }

    navigation.navigate(
      MainRoutes.MEDICATION_OCR_REVIEW,
      {
        result: {
          ...candidate,
          displayName: candidate.displayName.trim(),
          strength: candidate.strength?.trim() || "",
          directions: candidate.directions?.trim() || "",
          pharmacy: candidate.pharmacy?.trim() || "",
          rxNumber: candidate.rxNumber?.trim() || "",

          // ✅ NEW: pass through extra label fields
          pharmacyPhone: candidate.pharmacyPhone?.trim() || "",
          ndc: candidate.ndc?.trim() || "",
          quantity: candidate.quantity?.trim() || "",
          refills: candidate.refills?.trim() || "",
          fillDate: candidate.fillDate?.trim() || "",
          prescriber: candidate.prescriber?.trim() || "",
          patientName: candidate.patientName?.trim() || "",

          rawOcrText: candidate.rawOcrText || ocrText || "",
          confidence: candidate.confidence || "low",
          imageUri: imageUri || null,
        },
      } as any
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Import Medication Label</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
            <Text style={styles.actionText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
            <Text style={styles.actionText}>Choose Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />

        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyPreviewText}>No image selected</Text>
          </View>
        )}

        <View style={{ height: 12 }} />

        <TouchableOpacity
          style={[styles.primaryBtn, loadingOcr ? { opacity: 0.7 } : null]}
          onPress={run}
          disabled={loadingOcr}
        >
          {loadingOcr ? (
            <View style={styles.rowCenter}>
              <ActivityIndicator />
              <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>
                Scanning…
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Run OCR</Text>
          )}
        </TouchableOpacity>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={{ height: 12 }} />

        <Text style={styles.label}>Medication name</Text>
        <TextInput
          style={styles.input}
          value={candidate?.displayName ?? ""}
          onChangeText={(t) =>
            setCandidate((prev) =>
              prev
                ? { ...prev, displayName: t }
                : ({
                    displayName: t,
                    strength: "",
                    directions: "",
                    pharmacy: "",
                    rxNumber: "",
                    rawOcrText: ocrText || "",
                    confidence: "low",
                  } as any)
            )
          }
          placeholder="e.g., PROGESTERONE"
        />

        <View style={{ height: 12 }} />

        <TouchableOpacity
          style={[styles.secondaryBtn, !canContinue ? { opacity: 0.5 } : null]}
          onPress={goToReview}
          disabled={!canContinue}
        >
          <Text style={styles.secondaryBtnText}>Continue to Review</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { fontWeight: "900", color: "#111" },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },

  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "900" },

  previewWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
  preview: { width: "100%", height: 220, resizeMode: "cover" },
  emptyPreview: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPreviewText: { color: "#777", fontWeight: "800" },

  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#2b2b2b",
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },
  rowCenter: { flexDirection: "row", alignItems: "center" },

  label: { fontSize: 12, fontWeight: "900", color: "#333", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "700",
  },

  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#0b62ff",
    alignItems: "center",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "900" },

  errorText: { marginTop: 10, color: "#c00", fontWeight: "800" },
});
