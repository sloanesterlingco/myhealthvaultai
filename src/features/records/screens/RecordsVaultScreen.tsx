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
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { SectionHeader } from "../../../ui/SectionHeader";
import { theme } from "../../../theme";
import { db, auth } from "../../../lib/firebase";

import { runOCR } from "../../../services/ocrApi";
import { uploadRecordImage } from "../../../services/uploadService";
import { timelineService } from "../../medicalTimeline/services/timelineService";

const WEB_PORTAL_URL = "https://myhealthvaultai.com/app";

const VISIT_RECORDER_DEEP_LINK = "visitrecorder://";
const VISIT_RECORDER_PLAYSTORE_WEB =
  "https://play.google.com/store/apps/details?id=com.visitrecorder.app";

function requireUser() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in.");
  return u;
}

async function tryOpenUrl(url: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

async function openVisitRecorderApp() {
  if (await tryOpenUrl(VISIT_RECORDER_DEEP_LINK)) return true;
  return false;
}

async function openVisitRecorderPlayStore() {
  try {
    await Linking.openURL(VISIT_RECORDER_PLAYSTORE_WEB);
  } catch {
    // no-op
  }
}

async function openWebPortal() {
  try {
    const can = await Linking.canOpenURL(WEB_PORTAL_URL);
    if (!can) {
      Alert.alert(
        "Cannot open web portal",
        "Your device can’t open this link right now."
      );
      return;
    }
    await Linking.openURL(WEB_PORTAL_URL);
  } catch {
    Alert.alert("Cannot open web portal", "Your device can’t open this link right now.");
  }
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
  const baseDir: string = fsAny.cacheDirectory || fsAny.documentDirectory || "";

  if (!baseDir) return uri;

  const dest = `${baseDir}mhv_record_${Date.now()}.jpg`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

function FeatureRow({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  rightText,
}: {
  icon: any;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightText?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.featureRow}>
      <View style={[styles.featureIconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={18} color="#0F172A" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.featureSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.featureRight}>
        {rightText ? <Text style={styles.featureRightText}>{rightText}</Text> : null}
        <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
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

  const resetUpload = useCallback(() => {
    setPhotoUri(null);
    setOcrText("");
    setFileName("");
  }, []);

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

      const fsAny = FileSystem as any;
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: (fsAny.EncodingType?.Base64 ?? "base64") as any,
      });

      const mimeType = localUri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

      // ✅ IMPORTANT: Use the same key as the working flows (fileBase64)
      const result = await runOCR({
        fileBase64: base64,
        mimeType,
        fileName: `${effectiveName}.jpg`,
        documentType: "other",
        sourceType: "upload_record",
      } as any);

      const text = (result?.text || "").trim();
      setOcrText(text);

      if (!text) {
        Alert.alert("OCR", "No text was detected. You can still save the image.");
      }
    } catch (e: any) {
      console.log("runOcrNow error", e);

      const msg = e?.message || "We couldn't read text from this image.";

      Alert.alert("OCR failed", msg, [
        {
          text: "Back",
          style: "cancel",
          onPress: resetUpload, // clears photo so you can start over
        },
        {
          text: "Try Again",
          onPress: () => {
            // keep photo, just clear the OCR text so user can retry
            setOcrText("");
          },
        },
      ]);
    } finally {
      setOcrLoading(false);
    }
  }, [photoUri, effectiveName, resetUpload]);

  const saveRecord = useCallback(async () => {
    if (!photoUri) {
      Alert.alert("Save", "Take a photo first.");
      return;
    }

    try {
      setSaveLoading(true);
      const user = requireUser();

      const upload = await uploadRecordImage(photoUri, { fileName: effectiveName });

      const recordDoc = {
        uid: user.uid,
        name: effectiveName,
        imageUrl: upload.url,
        storagePath: upload.path,
        ocrText: ocrText || "",
        createdAt: serverTimestamp(),
        source: "mobile_records_vault_v1",
      };

      const docRef = await addDoc(collection(db, "patients", user.uid, "recordsVault"), recordDoc);

      await timelineService.addEvent({
        type: "RECORD_UPLOAD",
        category: "records",
        summary: `Record: ${effectiveName}`,
        detail: ocrText ? ocrText : "Image saved to Records Vault.",
        level: "info",
        timestamp: Date.now(),
        meta: {
          source: "records_vault",
          recordId: docRef.id,
          recordName: effectiveName,
          imageUrl: upload.url,
          storagePath: upload.path,
          hasOcr: !!ocrText,
        },
      } as any);

      Alert.alert("Saved", "Your record was saved and added to your Timeline.");

      resetUpload();
    } catch (e: any) {
      console.log("saveRecord error", e);
      Alert.alert("Save failed", e?.message || "Could not save this record.");
    } finally {
      setSaveLoading(false);
    }
  }, [effectiveName, ocrText, photoUri, resetUpload]);

  const onVisitRecorder = useCallback(async () => {
    const opened = await openVisitRecorderApp();
    if (!opened) {
      Alert.alert(
        "Visit Recorder not installed",
        "Install Visit Recorder to record visits and unlock AI summaries (with changes noted).",
        [{ text: "Cancel", style: "cancel" }, { text: "Install", onPress: openVisitRecorderPlayStore }]
      );
    }
  }, []);

  const onAiSummaryPro = useCallback(() => {
    Alert.alert(
      "AI Summary (Pro)",
      "AI summaries with changes noted are powered by Visit Recorder. Open Visit Recorder to subscribe and unlock Pro.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Visit Recorder", onPress: onVisitRecorder },
        { text: "Open Web Portal", onPress: openWebPortal },
      ]
    );
  }, [onVisitRecorder]);

  const canSave = hasPhoto && !saveLoading;

  return (
    <ScreenContainer showHeader title="Records Vault" headerShowAvatar scroll contentStyle={{ paddingTop: 0 }}>
      {/* ✅ CTA Real Estate (1,2,3) */}
      <Card style={styles.ctaStackCard}>
        <FeatureRow
          icon="globe"
          iconBg="rgba(15, 23, 42, 0.06)"
          title="Web Portal"
          subtitle="Open your vault on desktop for easier viewing and uploads."
          onPress={openWebPortal}
        />
        <View style={styles.rowDivider} />
        <FeatureRow
          icon="mic"
          iconBg="rgba(11, 142, 142, 0.14)"
          title="Visit Recorder"
          subtitle="Record visits + get AI summaries (with changes noted)."
          onPress={onVisitRecorder}
          rightText="Open"
        />
        <View style={styles.rowDivider} />
        <FeatureRow
          icon="any"
          iconBg="rgba(29, 78, 216, 0.10)"
          title="AI Summary (Pro)"
          subtitle="Summaries + translation + export + sharing. Powered by Visit Recorder."
          onPress={onAiSummaryPro}
        />
      </Card>

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

            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }}>
                <Button label="Choose different photo" variant="secondary" onPress={pickFromLibrary} />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Button label="Remove" variant="ghost" onPress={resetUpload} />
              </View>
            </View>

            <View style={{ height: theme.spacing.md }} />

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

            <Button label={saveLoading ? "Saving…" : "Save to Vault"} onPress={saveRecord} disabled={!canSave} />
          </>
        )}
      </Card>

      <SectionHeader title="V1 Notes" />
      <Text style={styles.notes}>Tip: For best results, fill the frame and use bright, even lighting.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  ctaStackCard: {
    marginBottom: theme.spacing.md,
    paddingVertical: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  featureRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureRightText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.brand,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight ?? "rgba(15, 23, 42, 0.08)",
    marginHorizontal: 12,
  },

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
