// src/features/records/screens/RecordsVaultScreen.tsx

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { SectionHeader } from "../../../ui/SectionHeader";
import { theme } from "../../../theme";
import { db, auth } from "../../../lib/firebase";

import { runOCR } from "../../../services/ocrApi";
import { uploadRecordImage } from "../../../services/uploadService";
import { timelineService } from "../../medicalTimeline/services/timelineService";

function requireUser() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in.");
  return u;
}

/**
 * Android sometimes gives content:// URIs.
 * Copy to file:// so FileSystem + fetch() behave consistently.
 *
 * NOTE: Some projects have expo-file-system typings that do not expose
 * cacheDirectory/documentDirectory. We safely read them via `as any`.
 */
async function ensureLocalFileUri(uri: string): Promise<string> {
  if (!uri) return uri;
  if (!uri.startsWith("content://")) return uri;

  const fsAny = FileSystem as any;
  const baseDir: string =
    fsAny.cacheDirectory || fsAny.documentDirectory || "";

  // If we can't resolve a base directory, just return the original URI
  if (!baseDir) return uri;

  const dest = `${baseDir}mhv_record_${Date.now()}.jpg`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

export default function RecordsVaultScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const [ocrText, setOcrText] = useState<string>("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const hasPhoto = !!photoUri;

  const defaultName = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `Record_${y}-${m}-${day}`;
  }, []);

  const effectiveName = (fileName.trim() || defaultName).trim();

  const takePhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera permission", "Please allow camera access to take a photo.");
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.9,
        allowsEditing: false,
      });

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      const localUri = await ensureLocalFileUri(uri);
      setPhotoUri(localUri);
      setOcrText("");
      if (!fileName.trim()) setFileName(defaultName);
    } catch (e) {
      console.log("takePhoto error", e);
      Alert.alert("Camera", "Could not open the camera.");
    }
  }, [defaultName, fileName]);

  const pickFromLibrary = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photos permission", "Please allow photo access to choose an image.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.9,
        allowsEditing: false,
      });

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      const localUri = await ensureLocalFileUri(uri);
      setPhotoUri(localUri);
      setOcrText("");
      if (!fileName.trim()) setFileName(defaultName);
    } catch (e) {
      console.log("pickFromLibrary error", e);
      Alert.alert("Photos", "Could not open your photo library.");
    }
  }, [defaultName, fileName]);

  const runOcrNow = useCallback(async () => {
    if (!photoUri) {
      Alert.alert("OCR", "Take a photo first.");
      return;
    }

    try {
      setOcrLoading(true);

      const localUri = await ensureLocalFileUri(photoUri);

      // Typings in this repo don't expose EncodingType, so use `as any` safely.
      const fsAny = FileSystem as any;
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: (fsAny.EncodingType?.Base64 ?? "base64") as any,
      });

      const mimeType = localUri.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";

      const result = await runOCR({
        imageBase64: base64,
        mimeType,
        fileName: `${effectiveName}.jpg`,
        documentType: "other",
        sourceType: "upload_record",
      });

      const text = (result?.text || "").trim();
      setOcrText(text);

      if (!text) {
        Alert.alert("OCR", "No text was detected. You can still save the image.");
      }
    } catch (e) {
      console.log("runOcrNow error", e);
      Alert.alert("OCR", "OCR failed. You can still save the image.");
    } finally {
      setOcrLoading(false);
    }
  }, [photoUri, effectiveName]);

  const saveRecord = useCallback(async () => {
    if (!photoUri) {
      Alert.alert("Save", "Take a photo first.");
      return;
    }

    try {
      setSaveLoading(true);
      const user = requireUser();

      // 1) Upload image to Storage
      const upload = await uploadRecordImage(photoUri, { fileName: effectiveName });

      // 2) Store a record document for the web portal (Firestore)
      const recordDoc = {
        uid: user.uid,
        name: effectiveName,
        imageUrl: upload.url,
        storagePath: upload.path,
        ocrText: ocrText || "",
        createdAt: serverTimestamp(),
        source: "mobile_records_vault_v1",
      };

      await addDoc(collection(db, "patients", user.uid, "records"), recordDoc);

      // 3) Add Timeline card so user sees it immediately
      await timelineService.addEvent({
        type: "RECORD_UPLOAD",
        summary: `Record: ${effectiveName}`,
        detail: ocrText ? ocrText : "Image saved to Records Vault.",
        level: "info",
        timestamp: Date.now(),
        meta: {
          recordName: effectiveName,
          imageUrl: upload.url,
          storagePath: upload.path,
          hasOcr: !!ocrText,
        },
      } as any);

      Alert.alert("Saved", "Your record was saved and added to your Timeline.");

      // Reset for next upload
      setPhotoUri(null);
      setOcrText("");
      setFileName("");
    } catch (e: any) {
      console.log("saveRecord error", e);
      Alert.alert("Save failed", e?.message || "Could not save this record.");
    } finally {
      setSaveLoading(false);
    }
  }, [effectiveName, ocrText, photoUri]);

  const canSave = hasPhoto && !saveLoading;

  return (
    <ScreenContainer
      showHeader
      title="Records Vault"
      headerShowAvatar
      scroll
      contentStyle={{ paddingTop: 0 }}
    >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Upload a record</Text>
            <Text style={styles.sub}>Take a photo → OCR → name it → save.</Text>
          </View>

          <TouchableOpacity
            onPress={runOcrNow}
            activeOpacity={0.9}
            style={[styles.ocrPill, (ocrLoading || !hasPhoto) && { opacity: 0.6 }]}
            disabled={ocrLoading || !hasPhoto}
          >
            <Text style={styles.ocrPillText}>{ocrLoading ? "OCR…" : "OCR"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: theme.spacing.md }} />

        {!photoUri ? (
          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <Button label="Take photo" onPress={takePhoto} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Button label="Choose photo" variant="secondary" onPress={pickFromLibrary} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.previewWrap}>
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            </View>

            <Text style={styles.inputLabel}>File name</Text>
            <TextInput
              value={fileName}
              onChangeText={setFileName}
              placeholder={defaultName}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.input}
            />

            <View style={{ height: theme.spacing.sm }} />

            <Text style={styles.inputLabel}>OCR text (optional)</Text>
            <TextInput
              value={ocrText}
              onChangeText={setOcrText}
              placeholder="Run OCR or type notes here…"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { height: 120, textAlignVertical: "top" }]}
              multiline
            />

            <View style={{ height: theme.spacing.md }} />

            <Button
              label={saveLoading ? "Saving…" : "Save to Vault"}
              onPress={saveRecord}
              disabled={!canSave}
            />
          </>
        )}
      </Card>

      {/* ✅ Your SectionHeader only accepts `title` in this repo */}
      <SectionHeader title="V1 Notes" />
      <Text style={styles.notes}>
        Records Vault logic is optional for V1 launch; UI is accepted. OCR + save can be V1.1 if needed.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sub: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ocrPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  ocrPillText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  previewWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.md,
  },
  preview: {
    width: "100%",
    height: 220,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  notes: {
    marginTop: 6,
    marginBottom: theme.spacing.lg,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
