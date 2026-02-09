// src/features/records/screens/UploadRecordScreen.tsx

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { runOCR } from "../../../services/ocrApi";
import {
  uploadRecordFileFromUri,
  saveRecordToFirestore,
} from "../services/recordsVaultService";

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

function isPdf(mimeType: string) {
  return mimeType?.toLowerCase() === "application/pdf";
}

function guessNameFromUri(uri: string) {
  const parts = uri.split("/");
  return parts[parts.length - 1] || "record";
}

export default function UploadRecordScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(false);

  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState<string>("");

  const [ocrText, setOcrText] = useState<string>("");
  const [ranOcr, setRanOcr] = useState(false);

  const canRunOcr = useMemo(() => !!picked && !loading, [picked, loading]);
  const canSave = useMemo(() => !!picked && title.trim().length > 0 && !loading, [picked, title, loading]);

  async function takePhoto() {
    try {
      setLoading(true);
      setRanOcr(false);
      setOcrText("");

      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera Permission", "Please allow camera access to take a photo.");
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.9,
        base64: false,
      });

      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) throw new Error("No photo captured.");

      const name = "record_photo";
      setPicked({
        uri: asset.uri,
        name,
        mimeType: "image/jpeg",
      });
      setTitle("Medical record");
    } catch (e: any) {
      Alert.alert("Photo failed", e?.message || "Could not take a photo.");
    } finally {
      setLoading(false);
    }
  }

  async function pickFile() {
    try {
      setLoading(true);
      setRanOcr(false);
      setOcrText("");

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error("No file selected.");

      const name = asset.name || guessNameFromUri(asset.uri);

      setPicked({
        uri: asset.uri,
        name,
        mimeType: asset.mimeType || "application/octet-stream",
      });

      setTitle("Medical record");
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
        documentType: "other",
        fileUri: picked.uri,
        fileName: picked.name,
      } as any);

      setOcrText((resp?.text || "").toString());
      setRanOcr(true);
    } catch (e: any) {
      Alert.alert("OCR failed", e?.message || "Unable to read text from this file.");
      setRanOcr(true);
    } finally {
      setLoading(false);
    }
  }

  async function saveNow() {
    if (!picked) return;

    try {
      setLoading(true);

      // 1) Upload file to Firebase Storage
      const uploaded = await uploadRecordFileFromUri({
        fileUri: picked.uri,
        fileName: title.trim() || picked.name,
        mimeType: picked.mimeType,
      });

      // 2) Save metadata into Firestore (Records Vault + Timeline)
      await saveRecordToFirestore({
        title: title.trim(),
        documentType: "record",
        mimeType: uploaded.contentType,
        fileUrl: uploaded.downloadUrl,
        ocrText: ocrText || null,
      });

      Alert.alert("Saved", "Record uploaded and added to your timeline.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save this record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer
      showHeader
      title="Upload Record"
      subtitle="Take a photo, OCR it, name it, and save it to your vault."
      canGoBack
      scroll
      contentStyle={{ paddingTop: 0 }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Step 1 — Add your document</Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.actionButton, loading && styles.disabled]}
              disabled={loading}
              onPress={takePhoto}
              activeOpacity={0.9}
            >
              {loading ? <ActivityIndicator /> : <Text style={styles.actionText}>Take photo</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButtonSecondary, loading && styles.disabled]}
              disabled={loading}
              onPress={pickFile}
              activeOpacity={0.9}
            >
              <Text style={styles.actionTextSecondary}>Choose file</Text>
            </TouchableOpacity>
          </View>

          {picked ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={styles.meta}>Selected: {picked.name}</Text>
              <Text style={styles.meta}>Type: {picked.mimeType}</Text>
            </View>
          ) : (
            <Text style={[styles.meta, { marginTop: theme.spacing.md }]}>
              Tip: “Take photo” is the simplest V1 path.
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Step 2 — Name it (required)</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Example: Cardiology visit note"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            editable={!loading}
          />

          <Text style={styles.helper}>
            This name is what you’ll see in Docs and in your Timeline card.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Step 3 — OCR (optional but recommended)</Text>

          <Button
            label={picked ? "Run OCR" : "Run OCR (select a file first)"}
            variant="secondary"
            onPress={picked ? runOcrNow : undefined}
            disabled={!canRunOcr}
            style={{ marginTop: 6 }}
          />

          {ranOcr ? (
            <View style={{ marginTop: theme.spacing.md }}>
              {ocrText ? (
                <>
                  <Text style={styles.ocrLabel}>OCR Text (preview)</Text>
                  <Text style={styles.ocrText} numberOfLines={10}>
                    {ocrText}
                  </Text>
                </>
              ) : (
                <Text style={styles.helper}>
                  OCR ran, but no text was found (or OCR failed). You can still save the record.
                </Text>
              )}
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Step 4 — Save</Text>

          <Button
            label={loading ? "Saving…" : "Save to Records Vault"}
            onPress={canSave ? saveNow : undefined}
            disabled={!canSave}
          />

          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: theme.spacing.sm }}
          />

          <Text style={styles.helper}>
            After saving: you’ll see a Timeline card + the file will appear in Docs.
          </Text>
        </Card>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.brand,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },

  actionButtonSecondary: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  actionTextSecondary: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
  },

  disabled: { opacity: 0.55 },

  meta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },

  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },

  helper: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  ocrLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6,
  },
  ocrText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
